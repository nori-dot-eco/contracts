// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/presets/ERC20PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "./NORI.sol";
import { ScheduleUtils, Schedule, Cliff } from "./ScheduleUtils.sol";

contract LockedNORI is ERC777Upgradeable, ERC20PresetMinterPauserUpgradeable, IERC777RecipientUpgradeable {
  using ScheduleUtils for Schedule;

  // TODO Remove for privacy reasons?
  event TokenGrantCreated(
    address indexed recipient,
    uint256 amount,
    uint256 startTime,
    uint256 vestEndTime,
    uint256 unlockEndTime
  );
  event TokenGrantTransferred(address from, address to);
  event UnvestedTokensRevoked(uint256 atTime, address from, uint256 quantity);
  event TokensClaimed(address account, uint256 quantity);

  struct TokenGrant {
    Schedule vestingSchedule;
    Schedule lockupSchedule;
    uint256 grantAmount;
    uint256 claimedAmount;
    uint256 originalAmount;
    bool exists;
  }

  bytes32 public constant TOKEN_GRANTER_ROLE = keccak256("TOKEN_GRANTER_ROLE");


  mapping(address => TokenGrant) grants;
  ERC777Upgradeable _underlying;
  IERC1820RegistryUpgradeable private _erc1820;


  function initialize(IERC777Upgradeable noriAddress) public initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __ERC20Burnable_init_unchained();
    __Pausable_init_unchained();
    __ERC20Pausable_init_unchained();
    __ERC20PresetMinterPauser_init_unchained("Locked NORI", "lNORI");
    address[] memory operators = new address[](1);
    operators[0] = _msgSender();
    __ERC777_init_unchained("Locked NORI", "lNORI", operators);
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _underlying = ERC777Upgradeable(address(noriAddress));
    _erc1820 = IERC1820RegistryUpgradeable(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24); // todo
    _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
  }

  function tokensReceived(
    address,
    address,
    address,
    uint256 amount,
    bytes calldata userData,
    bytes calldata operatorData
  ) external override {
    require(
      msg.sender == address(_underlying),
      "LockedNORI: This contract can only receive NORI"
    ); // todo verify this can only be invoked by the nori contract
    // todo restrict such that only admin can invoke this function
    _depositFor(
      amount,
      userData,
      operatorData
    );
  }

  /**
   * @dev Allow a user to deposit _underlying tokens and mint the corresponding number of wrapped tokens.
   */
  function _depositFor(
    uint256 amount,
    bytes calldata userData,
    bytes calldata
  ) internal virtual returns (bool) {
    (address recipient) = abi.decode(userData, (address));
    _grantTo(
      amount,
      userData
    );
    ERC777Upgradeable._mint(
      recipient,
      amount,
      userData,
      ""
    );
    return true;
  }

  /**
   * @dev Allow a user to burn a number of wrapped tokens and withdraw the corresponding number of _underlying tokens.
   */
  function withdrawTo(address account, uint256 amount)
    public
    virtual
    returns (bool)
  {
    TokenGrant storage grant = grants[account];
    _burn(_msgSender(), amount, "", "");
    _underlying.send(account, amount, "");
    grant.claimedAmount += amount;
    emit TokensClaimed(account, amount);
    return true;
  }

  /**
   * @dev grantTo: Sets up an vesting + lockup schedule for recipient.
   *
   * Tokens must be wrapped in the name of the recipient separately using `depositFor`.
   * This can happen before or after creating the schedule or gradually over time.
   */
  function _grantTo(
    uint256 amount,
    bytes calldata userData
  ) internal whenNotPaused {
    // todo  onlyRole(TOKEN_GRANTER_ROLE)
    (
      address recipient,
      uint256 startTime,
      uint256 vestEndTime,
      uint256 unlockEndTime,
      uint256 cliff1Time,
      uint256 cliff2Time,
      uint256 vestCliff1Amount,
      uint256 vestCliff2Amount,
      uint256 unlockCliff1Amount,
      uint256 unlockCliff2Amount
    ) = abi.decode(
      userData,
      (
        address,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
      )
    );
    console.log(
      startTime,
      vestEndTime,
      // unlockEndTime
      // cliff1Time,
      cliff2Time
    );
    require(
      address(recipient) != address(0),
      "Recipient cannot be zero address"
    );

    TokenGrant storage grant = grants[recipient];
    grant.grantAmount = amount;
    grant.originalAmount = amount;
    grant.exists = true;

    if (vestEndTime > startTime) {
      require(vestCliff1Amount >= unlockCliff1Amount 
        && vestCliff2Amount >= unlockCliff2Amount,
        "Unlock cliff amounts cannot exceed vest cliff amounts");
      grant.vestingSchedule.totalAmount = amount;
      grant.vestingSchedule.startTime = startTime;
      grant.vestingSchedule.endTime = vestEndTime;
      grant.vestingSchedule.addCliff(cliff1Time, vestCliff1Amount);
      grant.vestingSchedule.addCliff(cliff2Time, vestCliff2Amount);
    }

    grant.lockupSchedule.totalAmount = amount;
    grant.lockupSchedule.startTime = startTime;
    grant.lockupSchedule.endTime = unlockEndTime;
    grant.lockupSchedule.addCliff(cliff1Time, unlockCliff1Amount);
    grant.lockupSchedule.addCliff(cliff2Time, unlockCliff2Amount);

    emit TokenGrantCreated(
      recipient,
      amount,
      startTime,
      vestEndTime,
      unlockEndTime
    );
  }

  /**
   * @dev revokeUnvestedTokens: Truncates a vesting grant.
   *
   * Transfers any unvested tokens in *from*'s grant to *to*
   * and reduces the total grant size.
   *
   * No change is made to balances that have vested but not claimed
   * whether locked or not.
   */
  function revokeUnvestedTokens(
    uint256 atTime,
    address from,
    address to
  ) external onlyRole(TOKEN_GRANTER_ROLE) whenNotPaused {
    TokenGrant storage grant = grants[from];
    require(grant.exists, "No grant exist");
    uint256 vestedBalance = _vestedBalanceOf(atTime, from);
    // console.log(
    //   "[revokeUnvestedTokens] time: %s from: %s vestedBalance: %s",
    //   atTime,
    //   from,
    //   vestedBalance
    // );
    if (vestedBalance < grant.grantAmount) {
      uint256 quantityRevoked = grant.grantAmount - vestedBalance;
      grant.grantAmount = vestedBalance;
    //   grant.vestingSchedule.totalAmount = vestedBalance;
    //   grant.lockupSchedule.totalAmount = vestedBalance;
      emit UnvestedTokensRevoked(atTime, from, quantityRevoked);
      // TODO: destination address for clawed back tokens should be a role
      // or an initialization parameter rather than the caller.
      console.log("from,to,quantityRevoked",from,to,quantityRevoked);
      console.log("grant.grantAmount",grant.grantAmount);
      console.log("vestedBalance",vestedBalance);
      operatorSend(
        from,
        to,
        quantityRevoked,
        "",
        ""
      );
    }
  }

  /**
   * @dev vestedBalanceOf: Vested balance less any claimed amount
   */
  function quantityRevokedFrom(address account) public view returns (uint256) {
    TokenGrant storage grant = grants[account];
    return grant.originalAmount - grant.grantAmount;
  }

  /**
   * @dev vestedBalanceOf: Vested balance less any claimed amount
   */
  function vestedBalanceOf(address account) public view returns (uint256) {
    return _vestedBalanceOf(block.timestamp, account);
  }

  /**
   * @dev vestedBalanceOf: Vested balance less any claimed amount
   */
  function _vestedBalanceOf(uint256 atTime, address account)
    internal
    view
    returns (uint256)
  {
    TokenGrant storage grant = grants[account];
    if (grant.exists) {
      if (grant.vestingSchedule.startTime > 0) {
        // If any tokens have been revoked then the schedule (which doesn't get updated) could
        // return more than the total grant amount.
        return
          MathUpgradeable.min(grant.grantAmount, grant.vestingSchedule.availableAmount(atTime)) - grant.claimedAmount;
      } else {
        return grant.grantAmount - grant.claimedAmount;
      }
    }
    return 0;
  }

  /**
   * @dev unlockedBalanceOf: Unlocked balance less any claimed amount
   */
  function unlockedBalanceOf(address account) public view returns (uint256) {
    TokenGrant storage grant = grants[account];
    if (grant.exists) {
      console.log("grant.vestingSchedule.availableAmount(block.timestamp)",grant.vestingSchedule.availableAmount(block.timestamp));
      console.log("grant.lockupSchedule.availableAmount(block.timestamp)",grant.lockupSchedule.availableAmount(block.timestamp));
      console.log("grant.claimedAmount",grant.claimedAmount);
      // If any tokens have been revoked then the schedule (which doesn't get updated) could
      // return more than the total grant amount.
      return
        MathUpgradeable.min(
          MathUpgradeable.min(
            grant.vestingSchedule.availableAmount(block.timestamp),
            grant.lockupSchedule.availableAmount(block.timestamp)
          ),
          grant.grantAmount
        ) - grant.claimedAmount;
    }
    return 0;
  }

  /**
   * @dev balanceOf: Total amount granted to the user less any previously claimed amount
   */
  function balanceOf(address account)
    public
    view
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (uint256)
  {
    return ERC777Upgradeable.balanceOf(account);
  }

  /**
   * @dev getGrant: Returns all governing settings on a grant.
   */
  function getGrant(address account)
    public
    view
    returns (
      uint256 amount,
      uint256 startTime,
      uint256 vestEndTime,
      uint256 unlockEndTime,
      uint256 cliff1Time,
      uint256 cliff2Time,
      uint256 vestCliff1Amount,
      uint256 vestCliff2Amount,
      uint256 unlockCliff1Amount,
      uint256 unlockCliff2Amount,
      uint256 claimedAmount,
      uint256 originalAmount
    )
  {
    TokenGrant storage grant = grants[account];
    return (
      grant.grantAmount,
      grant.lockupSchedule.startTime,
      grant.vestingSchedule.endTime,
      grant.lockupSchedule.endTime,
      grant.lockupSchedule.cliffs[0].time,
      grant.lockupSchedule.cliffs[1].time,
      grant.vestingSchedule.cliffs[0].amount,
      grant.vestingSchedule.cliffs[1].amount,
      grant.lockupSchedule.cliffs[0].amount,
      grant.lockupSchedule.cliffs[1].amount,
      grant.claimedAmount,
      grant.originalAmount
    );
  }

  function _isTokenGranter(address account) internal view returns (bool) {
    for (uint256 i = 0; i < getRoleMemberCount(TOKEN_GRANTER_ROLE); i++) {
      if (getRoleMember(TOKEN_GRANTER_ROLE, i) == account) {
        return true;
      }
    }
    return false;
  }

  /**
   * @dev called before send and transfer and used to disable transferring locket nori
   */
  function _beforeTokenTransfer(
    address,
    address from,
    address to,
    uint256 amount
  ) internal override {
    bool isNotMinting = from != address(0); // if it's not minting, then we check balances
    // this is a burn / unwrap
    if (isNotMinting) {
      uint256 availableBalance = unlockedBalanceOf(from);
      if(!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())){
        require(amount <= availableBalance, "LockedNORI: Withdrawl amount unavailable");
      }
    }
    console.log("before token transfer");
    super._beforeTokenTransfer(from, to, amount);
  }

  function _approve(
    address holder,
    address spender,
    uint256 value
  ) internal virtual override(ERC20Upgradeable, ERC777Upgradeable) {
    ERC777Upgradeable._approve(holder, spender, value);
  }

  function allowance(address holder, address spender)
    public
    view
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (uint256)
  {
    return ERC777Upgradeable.allowance(holder, spender);
  }

  function approve(address spender, uint256 value)
    public
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (bool)
  {
    return ERC777Upgradeable.approve(spender, value);
  }

  function decimals()
    public
    pure
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (uint8)
  {
    return ERC777Upgradeable.decimals();
  }

  function name()
    public
    view
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (string memory)
  {
    return ERC777Upgradeable.name();
  }

  function symbol()
    public
    view
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (string memory)
  {
    return ERC777Upgradeable.symbol();
  }

  function totalSupply()
    public
    view
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (uint256)
  {
    return ERC777Upgradeable.totalSupply();
  }

  function transfer(address recipient, uint256 amount)
    public
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (bool)
  {
    return ERC777Upgradeable.transfer(recipient, amount);
  }

  function transferFrom(
    address holder,
    address recipient,
    uint256 amount
  )
    public
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (bool)
  {
    return ERC777Upgradeable.transferFrom(holder, recipient, amount);
  }

  //   function _burn(
  //         address from,
  //         uint256 amount,
  //         bytes memory data,
  //         bytes memory operatorData
  //     ) internal virtual override {
  //         return ERC777Upgradeable._burn()
  //     }
}
