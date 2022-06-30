import "@openzeppelin/contracts-upgradeable/token/ERC777/presets/ERC777PresetFixedSupplyUpgradeable.sol";

contract TestToken777 is ERC777PresetFixedSupplyUpgradeable {
  function initialize() public virtual initializer {
    address[] memory operators;
    __ERC777PresetFixedSupply_init(
      "TestToken777",
      "T77",
      operators,
      1_000_000_000_000_000_000_000_000,
      _msgSender()
    );
  }
}
