                               
pragma solidity 0.8.30;
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {AdminAccess} from "./AdminAccess.sol";
import {FactoryCardFrame} from "./FactoryCardFrame.sol";
import {FactoryBuildings} from "./FactoryBuildings.sol";
import {FactoryEnvironment} from "./FactoryEnvironment.sol";
import {FactoryArtIndex as I} from "./FactoryArtIndex.sol";

                                                                                          
contract FoundryRenderer is AdminAccess {
    FactoryBuildings public immutable buildings;
    FactoryEnvironment public immutable environment;
    constructor(address administrator,address buildings_,address environment_) AdminAccess(administrator){require(buildings_.code.length>0&&environment_.code.length>0,"Missing art layers");buildings=FactoryBuildings(buildings_);environment=FactoryEnvironment(environment_);}
    function rarity(bytes32 seed,bool pending) public pure returns(uint8){uint256 roll=uint256(seed)%10000;return pending?5:roll<6000?0:roll<8500?1:roll<9500?2:roll<9900?3:4;}
    function rarityName(uint256 i) public pure returns(string memory){string[6] memory n=["Common","Uncommon","Rare","Epic","Legendary","Unrevealed"];return n[i];}
    function svg(uint16 blueprint,bytes32 seed,bool pending) public view returns(string memory){
        require(blueprint<16384,"Invalid blueprint");
        uint16[7] memory xs=[uint16(92),202,312,422,142,262,382];uint16[7] memory ys=[uint16(243),220,243,220,359,336,359];
        string memory image=string.concat('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 584" shape-rendering="crispEdges">',_background(seed));
        for(uint256 g;g<7;g++)image=string.concat(image,'<g transform="translate(',Strings.toString(xs[g]),' ',Strings.toString(ys[g]),')">',buildings.part(g*4+((blueprint>>(g*2))&3)),'</g>');
        uint256 s=uint256(seed);
        return string.concat(image,environment.part(I.LIGHTS+((s>>21)&3)),environment.part(I.MARKERS+((s>>25)&3)),FactoryCardFrame.render(rarity(seed,pending)),'</svg>');
    }
    function numberedSVG(uint256 id,uint16 blueprint,bytes32 seed) public view returns(string memory){
        bytes memory base=bytes(svg(blueprint,seed,false));assembly("memory-safe"){mstore(base,sub(mload(base),6))}
        return string.concat(string(base),'<rect x="24" y="22" width="464" height="24" fill="#0d131c"/><text x="256" y="39" text-anchor="middle" font-family="monospace" font-size="12" fill="#fff">ARCFOUNDRY / SERIAL ',Strings.toString(id),'</text></svg>');
    }
    function _background(bytes32 seed) private view returns(string memory){uint256 s=uint256(seed);return string.concat('<style>',environment.part(I.CONSTANT_STYLE),environment.part(I.WORLD_STYLE+(s&7)),environment.part(I.METAL_STYLE+((s>>6)&7)),environment.part(I.POWER_STYLE+((s>>9)&7)),'</style><rect width="512" height="512" fill="',environment.part(I.SKY+((s>>3)&7)),'"/>',environment.part(I.STARS),environment.part(I.MOONS+((s>>15)&3)),environment.part(I.SATELLITE+((s>>19)&3)),environment.part(I.ATMOSPHERE+((s>>17)&3)),environment.part(I.HORIZON+((s>>12)&7)),environment.part(I.GROUND),environment.part(I.WORLD+(s&7)),environment.part(I.PIPES+((s>>23)&3)));}
    function attr(string memory k,string memory v) private pure returns(string memory){return string.concat('{"trait_type":"',k,'","value":"',v,'"}');}
    function tokenURI(uint256 id,bytes32 seed,bool pending,uint32 epoch,uint16 blueprint) external view returns(string memory){
        uint256 s=uint256(seed);string[7] memory zones=["Production","Smelter","Storage","Power","Processing","Command","Logistics"];
        string memory attributes=string.concat(attr("Origin","Proof of work"),',',attr("Rarity",rarityName(rarity(seed,pending))),',',attr("Epoch",Strings.toString(epoch)),',',attr("Planet",pending?"Awaiting reveal":environment.part(I.WORLD_NAME+(s&7))),',',attr("Sky",pending?"Awaiting reveal":environment.part(I.SKY_NAME+((s>>3)&7))),',',attr("Material",pending?"Awaiting reveal":environment.part(I.MATERIAL_NAME+((s>>6)&7))),',',attr("Energy",pending?"Awaiting reveal":environment.part(I.POWER_NAME+((s>>9)&7))),',',attr("Blueprint",Strings.toString(blueprint)));
        for(uint256 g;g<7;g++)attributes=string.concat(attributes,',',attr(zones[g],buildings.part(28+g*4+((blueprint>>(g*2))&3))));
        return string.concat('data:application/json;base64,',Base64.encode(bytes(string.concat('{"name":"ArcFoundry Factory #',Strings.toString(id),'","description":"A numbered seven-zone factory on an alien planet, mined with proof of work. Buildings, landscape and rarity frame are rendered onchain. Rarity affects appearance only.","image":"data:image/svg+xml;base64,',Base64.encode(bytes(numberedSVG(id,blueprint,seed))),'","attributes":[',attributes,']}'))));
    }
}
