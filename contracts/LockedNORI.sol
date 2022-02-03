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

  struct TokenGrantDetail {
      uint256 grantAmount;
      address recipient;
      uint256 startTime;
      uint256 vestEndTime;
      uint256 unlockEndTime;
      uint256 cliff1Time;
      uint256 cliff2Time;
      uint256 vestCliff1Amount;
      uint256 vestCliff2Amount;
      uint256 unlockCliff1Amount;
      uint256 unlockCliff2Amount;
      uint256 claimedAmount;
      uint256 originalAmount;
  }

  struct CreateTokenGrantParams {
      address recipient;
      uint256 startTime;
      uint256 vestEndTime;
      uint256 unlockEndTime;
      uint256 cliff1Time;
      uint256 cliff2Time;
      uint256 vestCliff1Amount;
      uint256 vestCliff2Amount;
      uint256 unlockCliff1Amount;
      uint256 unlockCliff2Amount;
  }

  struct DepositForParams {
      address recipient;
      uint256 startTime;
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
    _setupRole(TOKEN_GRANTER_ROLE, _msgSender());
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
   * @dev Internal callback from tokensDeposited hook, wraps minting wrapped token and grant setup.
   */
  function _depositFor(
    uint256 amount,
    bytes calldata userData,
    bytes calldata operatorData
  ) internal returns (bool) {
    DepositForParams memory params = abi.decode(userData, (DepositForParams));
    // If a startTime parameter is non-zero then set up a schedule
    if (params.startTime > 0) {
      _grantTo(
        amount,
        userData
      );
    }

    ERC777Upgradeable._mint(
      params.recipient,
      amount,
      userData,
      operatorData
    );
    return true;
  }

  /**
   * @dev Allow a user to burn a number of wrapped tokens and withdraw the corresponding number of _underlying tokens.
   */
  function withdrawTo(address account, uint256 amount)
    external
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
   * @dev _grantTo: Sets up an vesting + lockup schedule for recipient.
   *
   * Typically this will be invoked via the `tokensReceived` callback for cases
   * where we have the tokens in hand at the time we set up the grant.
   *
   * It is also callable externally to handle the case that tokens are incrementally
   * deposited after the grant is established.
   */
  function _grantTo(
    uint256 amount,
    bytes memory userData
  ) internal {
    CreateTokenGrantParams memory params = abi.decode(
      userData,
      (CreateTokenGrantParams)
    );
    require(
      address(params.recipient) != address(0),
      "Recipient cannot be zero address"
    );

    TokenGrant storage grant = grants[params.recipient];
    grant.grantAmount = amount;
    grant.originalAmount = amount;
    grant.exists = true;

    if (params.vestEndTime > params.startTime) {
      require(params.vestCliff1Amount >= params.unlockCliff1Amount
        || params.vestCliff2Amount >= params.unlockCliff2Amount,
        "Unlock cliff amounts cannot exceed vest cliff amounts");
      grant.vestingSchedule.totalAmount = amount;
      grant.vestingSchedule.startTime = params.startTime;
      grant.vestingSchedule.endTime = params.vestEndTime;
      grant.vestingSchedule.addCliff(params.cliff1Time, params.vestCliff1Amount);
      grant.vestingSchedule.addCliff(params.cliff2Time, params.vestCliff2Amount);
    }

    grant.lockupSchedule.totalAmount = amount;
    grant.lockupSchedule.startTime = params.startTime;
    grant.lockupSchedule.endTime = params.unlockEndTime;
    grant.lockupSchedule.addCliff(params.cliff1Time, params.unlockCliff1Amount);
    grant.lockupSchedule.addCliff(params.cliff2Time, params.unlockCliff2Amount);

    emit TokenGrantCreated(
      params.recipient,
      amount,
      params.startTime,
      params.vestEndTime,
      params.unlockEndTime
    );
  }

  /**
   * @dev grantTo: Sets up an vesting + lockup schedule for recipient.
   *
   * Typically this will be invoked via the `tokensReceived` callback for cases
   * where we have the tokens in hand at the time we set up the grant.
   *
   * It is also callable externally to handle the case that tokens are incrementally
   * deposited after the grant is established.
   */
  function grantTo(
    uint256 amount,
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
  ) external whenNotPaused onlyRole(TOKEN_GRANTER_ROLE) {
    bytes memory userData = abi.encode(
        recipient,
        startTime,
        vestEndTime,
        unlockEndTime,
        cliff1Time,
        cliff2Time,
        vestCliff1Amount,
        vestCliff2Amount,
        unlockCliff1Amount,
        unlockCliff2Amount);
    _grantTo(
        amount,
        userData
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
      _revokeUnvestedTokens(atTime, from, to);
  }

  function _revokeUnvestedTokens(
    uint256 atTime,
    address from,
    address to
  ) internal {
    TokenGrant storage grant = grants[from];
    require(grant.exists, "No grant exist");
    uint256 vestedBalance = _vestedBalanceOf(atTime, from);
    if (vestedBalance < grant.grantAmount) {
      uint256 quantityRevoked = grant.grantAmount - vestedBalance;
      grant.grantAmount = vestedBalance;
      grant.vestingSchedule.totalAmount = vestedBalance;
      grant.vestingSchedule.endTime = atTime;
      emit UnvestedTokensRevoked(atTime, from, quantityRevoked);
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
  function quantityRevokedFrom(address account) external view returns (uint256) {
    TokenGrant storage grant = grants[account];
    return grant.originalAmount - grant.grantAmount;
  }

  /**
   * @dev vestedBalanceOf: Vested balance less any claimed amount
   */
  function vestedBalanceOf(address account) external view returns (uint256) {
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
    uint256 balance = 0;
    if (grant.exists) {
      if (grant.vestingSchedule.startTime > 0) {
        balance = grant.vestingSchedule.availableAmount(atTime) - grant.claimedAmount;
      } else {
        balance = grant.grantAmount - grant.claimedAmount;
      }
    }
    return balance;
  }

  /**
   * @dev unlockedBalanceOf: Unlocked balance less any claimed amount
   */
  function unlockedBalanceOf(address account) public view returns (uint256) {
      return _unlockedBalanceOf(block.timestamp, account);
  }

  /**
   * @dev _unlockedBalanceOf: Unlocked balance less any claimed amount
   */
  function _unlockedBalanceOf(uint256 atTime, address account) internal view returns (uint256) {
    TokenGrant storage grant = grants[account];
    uint256 balance = 0;
    if (grant.exists) {
      // If any tokens have been revoked then the schedule (which doesn't get updated) may
      // return more than the total grant amount.
      //
      // This is done to preserve the behavior of the unlock schedule despite a reduction in the total
      // quantity of tokens vesting.  i.o.w The rate of unlocking does not change after calling
      // `revokeUnvestedTokens`
      balance =
        MathUpgradeable.min(
          MathUpgradeable.min(
            grant.vestingSchedule.availableAmount(atTime),
            grant.lockupSchedule.availableAmount(atTime)
          ),
          grant.grantAmount
        ) - grant.claimedAmount;
    }
    return balance;
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
    external
    view
    returns (TokenGrantDetail memory)
  {
    TokenGrant storage grant = grants[account];
    return TokenGrantDetail(
      grant.grantAmount,
      account,
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
    // console.log("before token transfer");
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
