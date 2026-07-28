// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

interface ILoreloomGenesis {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @notice A chapter NFT. Each token is permanently linked to a Genesis token.
contract LoreloomChapter is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    ILoreloomGenesis public immutable genesisContract;
    uint256 private _nextTokenId = 1;
    mapping(uint256 chapterTokenId => uint256 genesisTokenId) public parentGenesisTokenId;

    event ChapterMinted(
        uint256 indexed chapterTokenId,
        uint256 indexed genesisTokenId,
        address indexed recipient,
        string tokenUri
    );

    constructor(
        string memory name_,
        string memory symbol_,
        address genesisContract_,
        address initialAdmin
    ) ERC721(name_, symbol_) {
        require(genesisContract_ != address(0), "LoreloomChapter: zero genesis");
        require(initialAdmin != address(0), "LoreloomChapter: zero admin");

        genesisContract = ILoreloomGenesis(genesisContract_);
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MINTER_ROLE, initialAdmin);
    }

    /// @dev The latest Genesis owner receives every future chapter in that world.
    function mintChapter(
        address recipient,
        uint256 genesisTokenId,
        string calldata tokenUri
    ) external onlyRole(MINTER_ROLE) returns (uint256 chapterTokenId) {
        require(recipient != address(0), "LoreloomChapter: zero recipient");
        require(bytes(tokenUri).length != 0, "LoreloomChapter: empty token URI");
        require(
            genesisContract.ownerOf(genesisTokenId) == recipient,
            "LoreloomChapter: recipient is not Genesis owner"
        );

        chapterTokenId = _nextTokenId++;
        _safeMint(recipient, chapterTokenId);
        _setTokenURI(chapterTokenId, tokenUri);
        parentGenesisTokenId[chapterTokenId] = genesisTokenId;

        emit ChapterMinted(chapterTokenId, genesisTokenId, recipient, tokenUri);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
