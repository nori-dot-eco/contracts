# Global

- [ ] document expected initialization state
- [ ] contract natspec documentation for top-level `contract` declarations
- [ ] consider generating interfaces for contracts (foundry has a cli tool for this)
- [ ] error declaration consistency (inside-contract vs outside-of-contract vs interface). Unclear what the best practice is, but interface declarations appear _some_ popular libraries
- [ ] globally consider renaming tokenId -> certificateId / removalId
- [ ] remove all non-inherited batch functions and use multicall instead (requires each contract inherits from MultiCall)
- [ ] check that whenNotPaused is on all mutating functions (and at-most called once per function call)
- [ ] consider using more permanent doc links for links to OZ documentation (e.g., git commit or ipfs if exists)
- [ ] @dev vs @notice consistency
- [ ] consistency in declaring structs in contract vs interface vs file-level
- [ ] make sure we expose getter/setters for private variables that we expect an admin to be able to change (e.g., fees, contracts, etc)
- [ ] verify all inherited initializers are called for all contracts
- [ ] de-duplicate redundant contract imports
- [ ] verify that we need to call \_grantRole(DEFAULT_ADMIN_ROLE, msg.sender) in all initializers (it might happen automatically already)
- [ ] update docgen
- [ ] run docgen
- [ ] Be consistent in describing whenNotPaused requirement (wording varies across uses currently). Perhaps consider defining a re-usable requirement that we reference (e.g., "conforms to requirement 'A'")
- [ ] Improve "Requirements" documentation of all functions (this should be defined for most functions-- esp. ones that mutate state)
- [ ] spell + grammar check
- [ ] consider following this Errors naming convention best practice https://twitter.com/PaulRBerg/status/1510584043028500492 (`ContractName__ErrorName`)
- [ ] consider name casing in contracts (e.g., LockedNORI vs LockedNori)
- [ ] ERC777PresetPausablePermissioned
- [ ] consider making all getters "page-able" so that they don't hit upper-bound limits with gas (e.g., getAllTokens(startId,endId))
- [ ] We need to make sure we are not falling trap to this enumerable set gotcha https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296/3 as it can result in unexpected behavior
- [ ] consider using named args for functions globlaly (e.g., fn({argName: 1})). Unclear what the tradeoffs are if any, but named arguments make things a lot more readable
- [ ] make sure we actually need EnumerableSets/maps where we currently use them (adds gas overhead if we don't need them)
- [ ] pack structs tightly to improve gas efficiency
- [ ] use mulDiv from OZ when calculating percentages (highly optimized (x \* y / denominator) with full precision)
- [ ] Enforce consistency in getter functions (e.g., use vs dont-use `get` prefix). What's the standard practice?
- [ ] Abide by checks-effects pattern
- [ ] fix remaining slither issues
- [ ] use slither in triage mode to remove inline `// slither-disable-line` comments
- [ ] Remove natspec comments that use syntax including `{...}` (e.g., See {https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit}) as this syntax is only valid for OpenZeppelins custom internal docgen
- [ ] never call functions in loops and isntead aggregate arguments and then use a single batch call (e.g., using MultiCall)
- [ ] use calldata where allowed to improve gas efficiency and enable array slicing
- [ ] (Gas Optimization): Declare variables outside of loop
- [ ] (Gas Optimization): minimze reads from storage (store variables in memory and load from memory instead if reading more than once)
- [ ] (Gas Optimization): use ++i in favor of i++
- [ ] (Gas Optimization): test gas of external vs public variant of same function, switch to external or public accordingly
- [ ] (Gas Optimization): look into this and use unchecked more https://github.com/OpenZeppelin/openzeppelin-contracts/issues/3512
- [ ] make sure solhint function ordering and variable ordering is correct
- [ ] Consider whether there is any additional logic we can or want to extract to presets, libs, etc
- [ ] make sure preset contract names use same standard naming convention that OZ uses (e.g., does `Preset` come before or after contract names)
- [ ] todo consider granularizing `registerContractAddresses` to `registerCONTRACT_NAMEAddress`
- [ ] consider renaming `registerContractAddresses` to `configureContract` and colocating any post-initialization setup into this function
- [ ] verify whether we can reduce the scope of `registerContractAddresses by shifting initializer logic
- [ ] make sure any unused inherited functions are permissioned/paused/disabled as expected
- [ ] verify each contract is defining and setting only the contract addresses that it needs to know about (e.g., does remova need to set the rNori contract address and so on). If the contract/address is set and never called by another contract, the answer is likely "no".
- [ ] make sure we are using `_disableInitializers()` everywehre we need to
- [ ] use better naming for all balance functions (e.g., balanceOfIds -> blanaceOfRemovalsForAccount)
- [ ] optimize events and consider gas costs of indexing arrays-- seems pointless to index arrays
- [ ] enable via_ir for deployments

# LockedNORI

- [ ] line 497: todo error handling

# BridgedPolygonNORI

- [ ] line 6: todo Security audit item: https://github.com/nori-dot-eco/contracts/security/code-scanning/499

# LockedNORILib

- [ ] line 77: todo Use custom errors

# Certificate

- [ ] line 15: \_ document burning behavior
- [ ] line 16: \_ ERC721a exposes both \_msgSender and \_msgSenderERC721A -- what are the differences and implications?
- [ ] line 17: \_ check that all transfer functions (including those not exposed in this file) call \_beforeTokenTransfers
- [ ] line 45: \_ Add tests that ensure \_removalsOfCertificate/\_certificatesOfRemoval can't deviate from Removal.sol balances
- [ ] line 107: Emit event when removal is released if TransferSingle events can be emitted with to: addr(0) in other cases
- [ ] line 108: decrease number of storage reads
- [ ] line 136: is this assembly abi decoder worth keeping? If so, add ABILib.sol? How much gas is it saving?
- [ ] line 171: short-circuit (skip to return statement) if there are no removals
- [ ] line 193: short-circuit (skip to return statement) if there are no certificates
- [ ] line 270: should we be using \_mint or \_safeMint for ERC721A
- [ ] line 291: De-duplicate code that checks array-length (e.g., library or base contract)
- [ ] line 302: finalze token URI

# ERC20Preset

- [ ] line 9: todo audit item: https://norinauts.slack.com/archives/C023A5VN86R/p1656529393031139

# Market

- [ ] line 24: \_ Emit events when state mutates and other existing events aren't capturing that change
- [ ] line 25: \_ Consider adding MARKET\*ADMIN_ROLE (sets thresholds, etc, so they can be done from admin ui without super admin)
- [ ] line 26: \ Consider adding getters for number of active suppliers
- [ ] line 27: \_ consider globally renaming "active"/"reserved" to names that better describe "(un)available" (e.g., "listed"?)
- [ ] line 28: \_ consistency in variables/fns that use "cumulative" vs "total" nomenclature (perhaps use count vs total)
- [ ] line 29: \_ consistency in variables/fns that use "supply" vs "removal" nomenclature (which means what?)
- [ ] line 120: \_ consider renaming getNoriFee to something like `calculateNoriFee`
- [ ] line 167: \_ consider removing `totalUnrestrictedSupply` as it can be calculated off chain using MultiCall
- [ ] line 174: compare this against trySub?
- [ ] line 197: revert if Market.onERC1155BatchReceived sender is not the removal contract
- [ ] line 209: consider moving rNori schedule creating logic to the Removal or rNori contracts if possible
- [ ] line 212: consider reverting when creating an rNori schedule if all removal IDs don't all belong to the same project
- [ ] line 292: \_ make `swapFromSpecificSupplier` and `swap` re-use more of the same logic to de-dupe code
- [ ] line 340: BUG: `swapFromSpecificSupplier` -> `_checkSupply` should check the suppliers balance, not the markets
- [ ] line 351: Assure `_checkSupply` validates all possible market supply states
- [ ] line 377: are we making external calls throughout the contract? if so can we pass values down?
- [ ] line 386: retrieve balances in a single batch call
- [ ] line 426: revert single-supplier supply allocation if the total from suppliers != certificate amount
- [ ] line 441: address code-complexity solhint issue
- [ ] line 509: revert multi-supplier supply allocation if the total from suppliers != certificate amount
- [ ] line 564: \_ permission `fulfillOrder` now that it is external (or figure out how to use calldata with internal fns)
- [ ] line 565: \_ use correct check-effects pattern in `fulfillOrder`
- [ ] line 575: verify changes to `fulfillOrder` (memory->calldata arr args) that enabled [:index] arr slicing syntax is ok
- [ ] line 590: mint rNori in a single batch call
- [ ] line 601: use MultiCall to batch transfer bpNori in `fulfillOrder`
- [ ] line 619: \_ consider allowing operators of a removal to withdraw from the market
- [ ] line 620: \_ consider allowing calls to withdraw to specify the recipient address for the withdrawn removal
- [ ] line 647: flip param order
- [ ] line 651: can this be combined inside .removeRemoval?
- [ ] line 663: \_ Add the rest of the requirements
- [ ] line 664: \_ Emit event when removal is released if TransferSingle events can be emitted with to: addr(0) in other cases
- [ ] line 665: \_ is `whenNotPaused` modifier redundant since it's only invoked from `Removal.release` calls?
- [ ] line 676: what do we do when amount != removalBalance?

# NORI

- [ ] line 6: todo Security audit item: https://github.com/nori-dot-eco/contracts/security/code-scanning/499

# Removal

- [ ] line 9: shared Consider a shared MinterAccessPreset base contract that handles minting roles so role names can be shared
- [ ] line 10: consider globally renaming `account` to `owner`. Or if not, make sure we are cosnsistent with the naming
- [ ] line 11: disable unused inherited mint functions
- [ ] line 12: check that we are not re-defining logic inherited from `ERC1155SupplyUpgradeable` (esp. `totalSupply`)
- [ ] line 13: Removal.sol defines several structs making it a strong candidate for gas optimization
- [ ] line 14: consider removing cumulative fns and instead use multicall where needed to prevent defining fns that dont scale
- [ ] line 17: what is the max project ID size? Smaller id allows tighter `BatchMintRemovalsData` struct.
- [ ] line 57: \_ verify we need to define \_restrictedNori in the Removal contract
- [ ] line 71: Test accounting for `_removalIdToRemovalData` is maintained correctly (assuming we need it)
- [ ] line 73: Test accounting for `_projectIdToScheduleData` is maintained correctly (assuming we need it)
- [ ] line 74: consider moving `Removal._projectIdToScheduleData` to rNori
- [ ] line 76: Test accounting for `_addressToOwnedTokenIds` is maintained correctly (assuming we need it)
- [ ] line 133: consider changing the ids arg from uint256[] -> UnpackedRemovalIdV0[]
- [ ] line 134: is a struct necessary for the data arg? Can we just add args instead?
- [ ] line 147: access \_removalIdToRemovalData[removalId] once per loop
- [ ] line 182: are we accounting for what needs to happen in rNori when a removal is released?
- [ ] line 183: how should we handle the case where a certificate amount is 0 after releasing?
- [ ] line 184: adequately test accounting when release is called (e.g., check child balances, parent balances, etc)
- [ ] line 208: consider making `getProjectIdForRemoval` return the whole schedule struct instead of the id
- [ ] line 250: `cumulativeBalanceOfBatch` will not scale well- consider dropping it (and any other fns relying on set.values)
- [ ] line 281: tokensOfOwner will not scale well as it relies on set.values- consider dropping it
- [ ] line 283: global rename (tokens -> removals?)
- [ ] line 288: rename cumulativeBalanceOf -> cumulativeBalanceOfOwner (if we decide to keep it)
- [ ] line 289: this function will not scale well as it relies on set.values- consider dropping it
- [ ] line 291: if we decide to keep this function, improve internal abstraction to re-use across cumulative funcs
- [ ] line 323: batch retrieve balances outside of loop
- [ ] line 334: look into using calldata elsewhere
- [ ] line 363: consider adding `listForSale` as a function instead of overriding `safeBatchTransferFrom`
- [ ] line 402: releaseFromCertificate vs releaseUnlisted
- [ ] line 457: find a way to merge \_afterTokenTransfer and \_beforeTokenTransfer, otherwise we loop through all IDs 2x
- [ ] line 463: batch calls to remove using multicall instead of calling in a loop
- [ ] line 464: handle failed calls to remove with a custom error

# RemovalQueue

- [ ] line 8: if we order removals in round robin order when listing, why care about tracking the order of addresses?
- [ ] line 9: why can't encoded vintages be used to order removals instead of storing their set here?
- [ ] line 10: can the `RemovalQueueByVintage`+`RoundRobinOrder` structs be further optimized?
- [ ] line 17: rename RemovalQueue to RemovalQueueLib
- [ ] line 61: rename `RemovalQueue.removeRemoval` to `RemovalQueue.remove`

# RestrictedNORI.sol

- [ ] line 13: Is this fully addressed: https://github.com/nori-dot-eco/contracts/pull/249/files#r906867575
- [ ] line 25: remove the `exists` property from the `ScheduleSummary` struct and infer it instead
- [ ] line 219: finalize rNori uri if it needs one
- [ ] line 482: improve wording
- [ ] line 628: (Gas Optimization): is it more expensive to call balanceOf multiple times, or to construct this array?
- [ ] line 660: use multicall to batch burn rNori outside of loop

---

# Longer term considerations

## global

- [ ] consider using diamond storage to further improve child token DX and gas efficiency (see ERC721ALayout for example)
- [ ] consider swapping the encoded supplier address in the removal ID with something more useful
- [ ] consider better ways to track underlying balances of the certificate (e.g., diamond storage?, etc.). Currently we are duplicating accounting for removals
- [ ] come up with a better way to track contract addresses across contracts (e.g., a shared registry contract)
- [ ] migrate hardhat tests to foundry tests
