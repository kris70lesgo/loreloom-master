// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @notice The root NFT for a Loreloom world. Token metadata is immutable once minted.
contract LoreloomGenesis is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId = 1;

    event GenesisMinted(uint256 indexed tokenId, address indexed recipient, string tokenUri);

    constructor(string memory name_, string memory symbol_, address initialAdmin) ERC721(name_, symbol_) {
        require(initialAdmin != address(0), "LoreloomGenesis: zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MINTER_ROLE, initialAdmin);
    }

    function mint(address recipient, string calldata tokenUri) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(recipient != address(0), "LoreloomGenesis: zero recipient");
        require(bytes(tokenUri).length != 0, "LoreloomGenesis: empty token URI");

        tokenId = _nextTokenId++;
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, tokenUri);

        emit GenesisMinted(tokenId, recipient, tokenUri);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
