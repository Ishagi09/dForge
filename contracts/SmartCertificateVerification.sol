// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Smart Certificate Verification
/// @notice Issue, revoke and verify tamper-proof certificates on-chain.
/// @dev Every certificate is bound to the SHA-256 hash of its source document, so a
///      verifier holding the file can look the record up directly. Certificate ids are
///      derived from a monotonically increasing nonce, so identical certificates issued
///      in the same block still receive distinct ids.
contract SmartCertificateVerification {
    /// @notice Why a certificate is, or is not, currently valid.
    enum Status {
        NonExistent,
        Valid,
        Revoked,
        Expired
    }

    /// @dev Field order is deliberate: the address/uint64/bool group packs tightly.
    ///      slot 0: issuer(20) + issuedAt(8) + revoked(1) = 29 bytes
    ///      slot 1: recipient(20) + expiresAt(8)          = 28 bytes
    struct Certificate {
        address issuer;
        uint64 issuedAt;
        bool revoked;
        address recipient;
        uint64 expiresAt; // 0 == never expires
        bytes32 fileHash; // SHA-256 of the certificate document
        string recipientName;
        string courseName;
        string metadataURI; // e.g. an IPFS CID for the document itself
    }

    address public owner;
    address public pendingOwner;

    /// @notice Total number of certificates ever issued, including revoked ones.
    uint256 public totalCertificates;

    mapping(bytes32 => Certificate) private _certificates;
    mapping(bytes32 => bytes32) private _idByFileHash;
    mapping(address => bool) public issuers;
    mapping(address => bytes32[]) private _certificatesOf;

    error NotOwner();
    error NotPendingOwner();
    error NotIssuer();
    error NotAuthorized();
    error CertificateNotFound();
    error AlreadyRevoked();
    error ZeroAddress();
    error EmptyField();
    error InvalidExpiry();
    error LengthMismatch();
    error InvalidFileHash();
    error FileHashAlreadyRegistered();

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);
    event CertificateIssued(
        bytes32 indexed certificateId,
        bytes32 indexed fileHash,
        address indexed issuer,
        address recipient,
        string recipientName,
        string courseName,
        uint64 expiresAt
    );
    event CertificateRevoked(bytes32 indexed certificateId, address indexed revokedBy);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyIssuer() {
        if (!issuers[msg.sender]) revert NotIssuer();
        _;
    }

    constructor() {
        owner = msg.sender;
        issuers[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit IssuerAuthorized(msg.sender);
    }

    // --------------------------------------------------------------------
    // Ownership (two-step, so a typo'd address cannot brick the contract)
    // --------------------------------------------------------------------

    /// @notice Begin transferring ownership. The new owner must call `acceptOwnership`.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /// @notice Complete a pending ownership transfer.
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previousOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }

    // --------------------------------------------------------------------
    // Issuer management
    // --------------------------------------------------------------------

    /// @notice Grant an address permission to issue certificates.
    function authorizeIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert ZeroAddress();
        issuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /// @notice Revoke an address's permission to issue certificates.
    /// @dev Certificates already issued by this address remain valid.
    function revokeIssuer(address issuer) external onlyOwner {
        issuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    // --------------------------------------------------------------------
    // Issuance
    // --------------------------------------------------------------------

    /// @notice Issue a certificate bound to a document's SHA-256 hash.
    /// @param fileHash SHA-256 of the certificate document. Must be non-zero and unused.
    /// @param recipient Wallet of the holder, or address(0) if not bound to a wallet.
    /// @param expiresAt Unix expiry timestamp, or 0 for a certificate that never expires.
    /// @return certificateId The unique id of the new certificate.
    function issueCertificate(
        bytes32 fileHash,
        address recipient,
        string calldata recipientName,
        string calldata courseName,
        string calldata metadataURI,
        uint64 expiresAt
    ) external onlyIssuer returns (bytes32 certificateId) {
        return _issue(fileHash, recipient, recipientName, courseName, metadataURI, expiresAt);
    }

    /// @notice Issue the same course to many recipients, each with their own document.
    /// @dev `fileHashes`, `recipients` and `recipientNames` must all be the same length.
    function issueBatch(
        bytes32[] calldata fileHashes,
        address[] calldata recipients,
        string[] calldata recipientNames,
        string calldata courseName,
        string calldata metadataURI,
        uint64 expiresAt
    ) external onlyIssuer returns (bytes32[] memory certificateIds) {
        uint256 count = fileHashes.length;
        if (count != recipients.length || count != recipientNames.length) revert LengthMismatch();

        certificateIds = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            certificateIds[i] = _issue(
                fileHashes[i],
                recipients[i],
                recipientNames[i],
                courseName,
                metadataURI,
                expiresAt
            );
        }
    }

    function _issue(
        bytes32 fileHash,
        address recipient,
        string calldata recipientName,
        string calldata courseName,
        string calldata metadataURI,
        uint64 expiresAt
    ) private returns (bytes32 certificateId) {
        if (fileHash == bytes32(0)) revert InvalidFileHash();
        if (_idByFileHash[fileHash] != bytes32(0)) revert FileHashAlreadyRegistered();
        if (bytes(recipientName).length == 0 || bytes(courseName).length == 0) revert EmptyField();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiry();

        // abi.encode (not encodePacked) plus a nonce: no ambiguity between adjacent
        // dynamic fields, and no collision between identical certs in the same block.
        uint256 nonce = totalCertificates;
        certificateId = keccak256(
            abi.encode(nonce, address(this), block.chainid, msg.sender, recipient, fileHash)
        );

        _certificates[certificateId] = Certificate({
            issuer: msg.sender,
            issuedAt: uint64(block.timestamp),
            revoked: false,
            recipient: recipient,
            expiresAt: expiresAt,
            fileHash: fileHash,
            recipientName: recipientName,
            courseName: courseName,
            metadataURI: metadataURI
        });

        _idByFileHash[fileHash] = certificateId;

        unchecked {
            totalCertificates = nonce + 1;
        }

        // Only index real wallets, so lookups by holder stay free of junk entries.
        if (recipient != address(0)) {
            _certificatesOf[recipient].push(certificateId);
        }

        emit CertificateIssued(
            certificateId,
            fileHash,
            msg.sender,
            recipient,
            recipientName,
            courseName,
            expiresAt
        );
    }

    // --------------------------------------------------------------------
    // Revocation
    // --------------------------------------------------------------------

    /// @notice Permanently mark a certificate as revoked.
    /// @dev Callable by the certificate's original issuer or the contract owner.
    function revokeCertificate(bytes32 certificateId) external {
        Certificate storage cert = _certificates[certificateId];
        if (cert.issuedAt == 0) revert CertificateNotFound();
        if (msg.sender != cert.issuer && msg.sender != owner) revert NotAuthorized();
        if (cert.revoked) revert AlreadyRevoked();

        cert.revoked = true;
        emit CertificateRevoked(certificateId, msg.sender);
    }

    /// @notice Revoke by document hash, for when you have the file but not the id.
    function revokeByFileHash(bytes32 fileHash) external {
        bytes32 certificateId = _idByFileHash[fileHash];
        if (certificateId == bytes32(0)) revert CertificateNotFound();

        Certificate storage cert = _certificates[certificateId];
        if (msg.sender != cert.issuer && msg.sender != owner) revert NotAuthorized();
        if (cert.revoked) revert AlreadyRevoked();

        cert.revoked = true;
        emit CertificateRevoked(certificateId, msg.sender);
    }

    // --------------------------------------------------------------------
    // Verification / views
    // --------------------------------------------------------------------

    /// @notice Verify a certificate by its id.
    /// @return valid True only when it exists, is not revoked and has not expired.
    /// @return status Why the certificate is or is not valid.
    /// @return cert The stored certificate data (zeroed if it does not exist).
    function verifyCertificate(
        bytes32 certificateId
    ) external view returns (bool valid, Status status, Certificate memory cert) {
        cert = _certificates[certificateId];
        status = _statusOf(cert);
        valid = status == Status.Valid;
    }

    /// @notice Verify a document directly by its SHA-256 hash. One call, no id needed.
    /// @return valid True only when it exists, is not revoked and has not expired.
    /// @return status Why the certificate is or is not valid.
    /// @return certificateId The matching certificate id, or zero if unknown.
    /// @return cert The stored certificate data (zeroed if it does not exist).
    function verifyByFileHash(
        bytes32 fileHash
    )
        external
        view
        returns (bool valid, Status status, bytes32 certificateId, Certificate memory cert)
    {
        certificateId = _idByFileHash[fileHash];
        cert = _certificates[certificateId];
        status = _statusOf(cert);
        valid = status == Status.Valid;
    }

    /// @notice The certificate id registered for a document hash, or zero.
    function certificateIdByFileHash(bytes32 fileHash) external view returns (bytes32) {
        return _idByFileHash[fileHash];
    }

    /// @notice Current status of a certificate.
    function statusOf(bytes32 certificateId) external view returns (Status) {
        return _statusOf(_certificates[certificateId]);
    }

    /// @notice Convenience boolean check for a certificate's validity.
    function isValid(bytes32 certificateId) external view returns (bool) {
        return _statusOf(_certificates[certificateId]) == Status.Valid;
    }

    /// @notice Fetch a certificate's stored data.
    function getCertificate(bytes32 certificateId) external view returns (Certificate memory) {
        Certificate memory cert = _certificates[certificateId];
        if (cert.issuedAt == 0) revert CertificateNotFound();
        return cert;
    }

    /// @notice All certificate ids issued to a given wallet.
    function certificatesOf(address recipient) external view returns (bytes32[] memory) {
        return _certificatesOf[recipient];
    }

    /// @notice How many certificates a given wallet holds.
    function certificateCountOf(address recipient) external view returns (uint256) {
        return _certificatesOf[recipient].length;
    }

    function _statusOf(Certificate memory cert) private view returns (Status) {
        if (cert.issuedAt == 0) return Status.NonExistent;
        if (cert.revoked) return Status.Revoked;
        if (cert.expiresAt != 0 && cert.expiresAt <= block.timestamp) return Status.Expired;
        return Status.Valid;
    }
}
