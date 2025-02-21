// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import "./IPublicBulletinBoard.sol";

/**
 * @title Public Bulletin Board (PBB)
 * @notice Este contrato permite la creación de boletines públicos donde los usuarios autorizados pueden publicar mensajes.
 * @dev Compatible con el patrón proxy UUPS para actualizaciones individuales. Utiliza AccessControl para gestionar permisos.
 */
contract PublicBulletinBoard is 
    Initializable, 
    UUPSUpgradeable, 
    ReentrancyGuardUpgradeable, 
    AccessControlEnumerableUpgradeable, 
    IPublicBulletinBoard {
    
    string public name;
    mapping(uint256 => Message) public messages;
    uint256 public nextMessageId;

    uint256 public constant MAX_BYTES = 32;
    uint256 public constant MAX_MEMBERS_PER_CALL = 50;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MEMBER_ROLE = keccak256("MEMBER_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    uint256[100] private __gap;


    // ===== Modificadores =====

    modifier notZeroAddress(address _addr) {
    require(_addr != address(0), "Direccion no puede ser la direccion cero");
    _;
    }

    // ===== Constructor del contrato =====

    /**
     * @notice Constructor que deshabilita inicializadores para prevenir tomas de control.
     * @dev Llama a `_disableInitializers()` para evitar que el contrato pueda ser inicializado fuera de un proxy.
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() {
        _disableInitializers();
    }


    // ===== Inicialización del contrato =====
    
    /**
     * @notice Inicializa el contrato PBB.
     * @param _name Nombre del tablón público.
     * @param _owner Dirección del propietario inicial.
     * @param _factory Dirección del contrato factory que lo desplegó.
     */
    function initialize(string calldata _name, address _owner, address _factory) external notZeroAddress(_owner) notZeroAddress(_factory) initializer {
        
        require(bytes(_name).length > 0, "El nombre no puede estar vacio");
        require(bytes(_name).length <= 64, "El nombre no debe exceder 64 caracteres");

        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        name = _name;
        nextMessageId = 1;

        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(ADMIN_ROLE, _owner);

        _grantRole(DEVELOPER_ROLE, _factory);
        _grantRole(DEVELOPER_ROLE, _owner);

    }

    // ===== Actualización del contrato (UUPS) =====

    /**
     * @dev Autoriza actualizaciones del contrato solo para el contrato factory.
     * @param newImplementation Dirección de la nueva implementación.
     */
    function _authorizeUpgrade(address newImplementation) internal view override onlyRole(DEVELOPER_ROLE) notZeroAddress(newImplementation) {
        require(
            IPublicBulletinBoard(newImplementation).supportsInterface(type(IPublicBulletinBoard).interfaceId),
            "Implementacion incompatible"
        );
    }

    // ===== Gestión de Mensajes =====

    /**
     * @notice Añade un nuevo mensaje al tablón.
     * @param content Contenido del mensaje.
     * @param topic Tema del mensaje.
     * @dev Solo los miembros con el rol `MEMBER_ROLE` pueden añadir mensajes.
     */ 
    function addMessage(string calldata content, string calldata topic) external onlyRole(MEMBER_ROLE) nonReentrant {

        bytes32 contentBytes = _toBytes32(content);
        bytes32 topicBytes = _toBytes32(topic);

        messages[nextMessageId] = Message({
            id: nextMessageId,
            sender: msg.sender,
            content: contentBytes,
            topic: topicBytes,
            timestamp: block.timestamp
        });

        nextMessageId++;

        emit MessageAdded(msg.sender, content, topic, block.timestamp);
    }

    /**
     * @notice Recupera un mensaje por su ID.
     * @param id ID del mensaje.
     * @return El mensaje solicitado.
     */
    function getMessageById(uint256 id) external view returns (Message memory) {
        require(id > 0 && id < nextMessageId, "ID de mensaje no valido");
        return messages[id];
    }

    // ===== Control de Accesos =====    

    /**
     * @notice Añade un nuevo miembro autorizado.
     * @param newMember Dirección del nuevo miembro.
     */
    function addMember(address newMember) public onlyRole(ADMIN_ROLE) notZeroAddress(newMember) {
        require(!hasRole(MEMBER_ROLE, newMember), "El usuario ya es miembro");
        _grantRole(MEMBER_ROLE, newMember);
        emit MemberAdded(msg.sender, newMember, block.timestamp);
    }

    /**
     * @notice Añade varios nuevos miembros autorizados en una sola transacción.
     * @dev La función utiliza un bucle para añadir cada dirección de la lista proporcionada.
     *      El tamaño del array de direcciones está limitado por `MAX_MEMBERS_PER_CALL` para evitar
     *      que la transacción exceda el límite de gas permitido.
     * @param newMembers Lista de direcciones de los nuevos miembros a añadir.
     *        Cada dirección recibirá el rol `MEMBER_ROLE`.
     * @custom:require La lista `newMembers` no debe estar vacía.
     * @custom:require La longitud de `newMembers` no debe exceder `MAX_MEMBERS_PER_CALL`.
     * @custom:emit Se emite un evento `MemberAdded` por cada miembro añadido correctamente.
     * @custom:restriction Solo puede ser llamada por cuentas con el rol `ADMIN_ROLE`.
     * @custom:gasdependence El costo de la transacción crece linealmente con el tamaño del array.
     */
    function addMembers(address[] calldata newMembers) external onlyRole(ADMIN_ROLE) {
        require(newMembers.length > 0, "Lista de miembros vacia");
        require(newMembers.length <= MAX_MEMBERS_PER_CALL, "Se excede el maximo de miembros por llamada");

        for (uint256 i = 0; i < newMembers.length; i++) {
            addMember(newMembers[i]);
        }
    }

    /**
     * @notice Revoca el acceso de un miembro.
     * @param member Dirección del miembro a revocar.
     */
    function removeMember(address member) external onlyRole(ADMIN_ROLE) notZeroAddress(member) {
        require(hasRole(MEMBER_ROLE, member), "El usuario no es miembro");
        _revokeRole(MEMBER_ROLE, member);
        emit MemberRemoved(msg.sender, member, block.timestamp);
    }

    /**
     * @notice Añade un nuevo administrador.
     * @param newAdmin Dirección del nuevo administrador.
     */
    function addAdmin(address newAdmin) external onlyRole(ADMIN_ROLE) notZeroAddress(newAdmin) {
        require(!hasRole(ADMIN_ROLE, newAdmin), "El usuario ya es administrador");
        _grantRole(ADMIN_ROLE, newAdmin);
        emit AdminAdded(msg.sender, newAdmin, block.timestamp);
    }

    /**
     * @notice Revoca el rol de administrador.
     * @param admin Dirección del administrador a revocar.
     */
    function removeAdmin(address admin) external onlyRole(ADMIN_ROLE) notZeroAddress(admin) {
        require(admin != msg.sender, "No puedes revocarte a ti mismo");
        uint256 adminCount = getRoleMemberCount(ADMIN_ROLE);
        require(adminCount > 1, "No se puede revocar el unico administrador");
        _revokeRole(ADMIN_ROLE, admin);
        emit AdminRevoked(msg.sender, admin, block.timestamp);
    }

    // ===== Métodos de Utilidad =====

    /**
     * @notice Devuelve la versión del contrato.
     * @return La versión actual del contrato.
     */
    function version() public pure virtual returns (uint256) {
        return 1;
    }

    /**
     * @dev Convierte un string a bytes32. Requiere que la longitud del string sea <= MAX_BYTES.
     * @param source El string a convertir.
     * @return El resultado en bytes32.
     */
    function _toBytes32(string memory source) internal pure returns (bytes32) {
        bytes memory tempBytes = bytes(source);
        require(tempBytes.length <= MAX_BYTES, "String demasiado largo");
        bytes32 result;
        assembly {
            result := mload(add(source, 32))
        }
        return result;
    }

    /**
     * @dev Convierte bytes32 a string.
     * @param data El bytes32 a convertir.
     * @return El string resultante.
     */
    function _toString(bytes32 data) internal pure returns (string memory) {
        uint256 length = 0;
        while (length < 32 && data[length] != 0) {
            length++;
        }
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = data[i];
        }
        return string(result);
    }

    /**
     * @notice Indica que este contrato soporta `IPublicBulletinBoard` y otras interfaces heredadas.
     * @dev Sobrescribe `supportsInterface()` para reflejar compatibilidad con `IPublicBulletinBoard`.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, AccessControlEnumerableUpgradeable) returns (bool) {
        return interfaceId == type(IPublicBulletinBoard).interfaceId || 
            super.supportsInterface(interfaceId);
    }

}
