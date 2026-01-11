---
title: "What is Physical Backed Token"
topics: ["ethereum", "nft", "pbt"]
published: true
---

[Azuki](https://azuki.com) が 2022/10/17 に発表した新しい NFT の規格「Physical Backed Token」について深掘りしていきます。

![](https://static.looksnice.org/0x6853449a65b264478a4cD90903A65F0508441aC0/0x614d9f791a70c53370501b3753e8c882b0c38119a916db949e025c7340784c2f)

# Physical Backed Token とは何か

https://www.azuki.com/updates/pbt

Pysical Backed Token(以下 PBT)とは Azuki が新しく作った物理的な物とオンチェーンの所有を同期させるための EIP の規格(EIP-5791)です。

これを実現するために必要なのは PBT に準拠した Token と BEAN(Blockchain Enabled Authentication Network) Chip(以下チップ)の 2 つの要素が重要になります。またチップは非対称鍵ペアを自己生成できるチップであると要件が定義されています。

![](https://azuki-2.ghost.io/content/images/size/w1000/2022/10/whitechipexplainer.png)

## 非対称鍵ペアとは？

鍵ペアとは、ブロックチェーンの世界でもお馴染みの **公開鍵** と **秘密鍵** の両方を作成すること、またその鍵のことを指します。非対称暗号化とは、公開鍵を使用して情報を暗号化し対応する秘密鍵を用いて情報の復号化を行うことになります。この対象となるのは対象鍵暗号化です。対照暗号化は 1 つの鍵を用いて情報の暗号/復号を行います。

# use case

ユースケースとしては以下のものがあげられていました。

- 物品の分散型認証
  - スマホでスキャンするだけで現物を認証可能にする
- 物品の所有者の履歴を追跡可能にする
  - その物品の過去と現在の所有者を検証可能にすることで、ブランドは所有者だけでなく元所有者も含めて顧客体験を作ることができる
- デジタル上の体験のために物理的な製品の使用を可能にする
  - デジタルなトークンを保有することで物理的に何かを得たり、物理的な物を保有することによりデジタル上で何かを得たりして、相互の世界を干渉させる役割を持たせる

# Azuki の目指した世界

Azuki はこのチップを使って現物のものをスキャンすることでデジタル上の PBT の owner も所有者のアドレスにし、現物の所有者を認証できるようにしたいと考えています。彼らはこのスキャンをすることを **scan to own** と呼んでいます。
目指したい世界としては、デジタルとフィジカルの世界の共創なのかなと考えています。

![](https://storage.googleapis.com/zenn-user-upload/08be866af7e0-20221214.png)

# PBT の仕様

PBT は前途したように EIP-5791 で規約が決められています。

https://eips.ethereum.org/EIPS/eip-5791

EIP-5791 として定義しているのは NFT(EIP-721)の所有者を物理チップにリンクするための最小限のインターフェースです。そのため EIP-5791 は EIP-721 拡張と言えます。

## モチベーション

現在 NFT コレクターはデジタル資産を収集し、オンライン上で他の人と共有したりしていますが、物品の場合それが本物であり、所有者であることが確認された資産として NFT を展示する際の明確な基準が存在していません。現時点では NFT と物理資産は所有権が分離してると言えて、これらを証明するには信頼できる第三者(例えば StockX など)からのアクションが必要になります。

## 要件

PBT では物理的なアイテムに対して以下の条件を満たすチップを装着する必要があります。

1. チップは ECDSA secp256k1 非対称鍵ペアを安全に生成し保存ができる
2. チップは生成した秘密鍵でメッセージに署名ができる
3. チップの公開鍵は公開する
4. 秘密鍵をチップから抜き取ることはできない

## アプローチ

NFT を mint する際に対応するチップのアドレスを含んだイベントを投げる必要があり、NFT はチップとリンクしてないと mint できないようにします。
`transferTokenWithChip` という関数を呼ぶことで、チップにより署名された有効な署名が渡された場合に msg.sender に対して NFT を transfer します。

## 注意事項

以下のことはこの EIP の範囲外になります。

- 特定の NFT コレクションのチップアドレスが任意の EOA でなく、アイテムに埋められた物知的なチップが実際にマッピングされていることを信頼すること
- チップの劣化や損傷がないことを保証すること
- チップが物理的なものに取り付けられていること
- tokenId をチップのアドレスにマッピングすること

  - マッピングをすることは必要だが、どのようにしてマッピングするかは EIP の対象外

# 実装

https://github.com/chiru-labs/PBT

現状の EIP-5791 は以下の interface を実装することを規約として決めています（2022/12/04 現在）

```solidity
interface IERC5791 {
  function tokenIdFor(address chipAddress) external view returns (uint256);
  function isChipSignatureForToken(uint256 tokenId, bytes calldata payload, bytes calldata signature) external view returns (bool);
  function transferTokenWithChip(bytes calldata signatureFromChip, uint256 blockNumberUsedInSig, bool useSafeTransferFrom) external;
  function transferTokenWithChip(bytes calldata signatureFromChip, uint256 blockNumberUsedInSig) external;

  event PBTMint(uint256 indexed tokenId, address indexed chipAddress);
  event PBTChipRemapping(uint256 indexed tokenId, address indexed oldChipAddress, address indexed newChipAddress);
}
```

## サンプル実装を読んでみる

まず継承してるのは ERC-721 ではなく `ERC721ReadOnly` になります。

```solidity
contract ERC721ReadOnly is ERC721 {
  constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

  function approve(address to, uint256 tokenId) public virtual override {
      revert("ERC721 public approve not allowed");
  }

  function getApproved(uint256 tokenId) public view virtual override returns (address) {
      require(_exists(tokenId), "ERC721: invalid token ID");
      return address(0);
  }

  function setApprovalForAll(address operator, bool approved) public virtual override {
      revert("ERC721 public setApprovalForAll not allowed");
  }

  function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
      return false;
  }

  function transferFrom(address from, address to, uint256 tokenId) public virtual override {
      revert("ERC721 public transferFrom not allowed");
  }

  function safeTransferFrom(address from, address to, uint256 tokenId) public virtual override {
      revert("ERC721 public safeTransferFrom not allowed");
  }

  function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public virtual override {
      revert("ERC721 public safeTransferFrom not allowed");
  }
}
```

approve / getApproved / setApprovalForAll / isApprovalForAll / transferFrom / safeTransferFrom が全て revert で override されています。PBT は scan でしか NFT を移動できないようにするための制約になります。

PBT TokenData の形は以下のように定義されています。ERC-721 の tokenId と chipAddress がセットになっています。

```solidity
struct TokenData {
    uint256 tokenId;
    address chipAddress;
    bool set;
}
```

chipAddress と tokenId のマッピングを最初に作成します。tokenId の owner が Null Address じゃない時に revert される分岐が入っています。これはそもそも既存のコレクションの場合、Proxy パターンなどコントラクトを再デプロイできる形になっていないと ERC-721 を ERC-5791 に後からできないので、基本的に今から始めるプロジェクトで使う前提のようなコードになっています。また PBT にできたとしても現物のものを holder に送らないといけなくなり、NFT 起点でものが動いているので思想とマッチしないなと筆者も考えます。

```solidity
function _seedChipToTokenMapping(address[] memory chipAddresses, uint256[] memory tokenIds, bool throwIfTokenAlreadyMinted) internal {
  uint256 tokenIdsLength = tokenIds.length;

  if (tokenIdsLength != chipAddresses.length) {
    revert ArrayLengthMismatch();
  }

  for (uint256 i = 0; i < tokenIdsLength; ++i) {
    address chipAddress = chipAddresses[i];
    uint256 tokenId = tokenIds[i];

    if (throwIfTokenAlreadyMinted && _exists(tokenId)) {
      revert SeedingChipDataForExistingToken();
    }

    _tokenDatas[chipAddress] = TokenData(tokenId, chipAddress, true);
  }
}
```

chipAddress から tokenId を抜いてくる実装。

```solidity
function tokenIdMappedFor(address chipAddress) public view returns (uint256) {
  if (!_tokenDatas[chipAddress].set) {
    revert NoMappedTokenForChip();
  }

  return _tokenDatas[chipAddress].tokenId;
}

function tokenIdFor(address chipAddress) external view override returns (uint256) {
  uint256 tokenId = tokenIdMappedFor(chipAddress);

  if (!_exists(tokenId)) {
    revert NoMintedTokenForChip();
  }

  return tokenId;
}
```

token の transfer を行う実装です。どの token の transfer をするかを直接引数に取らず、wallet address と block number を繋いだものの署名、その時に使った block number を引数に渡して、そこから recover を行いチップのアドレスを導きます。その後、チップのアドレスから tokenId を引いてくることで NFT の transfer を行なっています。
block number は最新のものをいれて署名する必要がありますが、どの程度誤差を許すかを `getMaxBlockhashValidWindow()` という関数で決めています。サンプルでは 100 block までは許してくれるように設定されています。

```solidity
function _transferTokenWithChip(bytes calldata signatureFromChip, uint256 blockNumberUsedInSig, bool useSafeTransferFrom) internal virtual {
  uint256 tokenId = _getTokenDataForChipSignature(signatureFromChip, blockNumberUsedInSig).tokenId;

  if (useSafeTransferFrom) {
    _safeTransfer(ownerOf(tokenId), _msgSender(), tokenId, "");
  } else {
    _transfer(ownerOf(tokenId), _msgSender(), tokenId);
  }
}

function _getTokenDataForChipSignature(bytes calldata signatureFromChip, uint256 blockNumberUsedInSig) internal view returns (TokenData memory) {
  // The blockNumberUsedInSig must be in a previous block because the blockhash of the current
  // block does not exist yet.
  if (block.number <= blockNumberUsedInSig) {
    revert InvalidBlockNumber();
  }

  unchecked {
    if (block.number - blockNumberUsedInSig > getMaxBlockhashValidWindow()) {
      revert BlockNumberTooOld();
    }
  }

  bytes32 blockHash = blockhash(blockNumberUsedInSig);
  bytes32 signedHash = keccak256(abi.encodePacked(_msgSender(), blockHash)).toEthSignedMessageHash();
  address chipAddr = signedHash.recover(signatureFromChip);

  TokenData memory tokenData = _tokenDatas[chipAddr];
  if (tokenData.set) {
    return tokenData;
  }

  revert InvalidSignature();
}
```

つまり scan した時に最新の block number と scan した wallet のアドレスをチップの秘密鍵を使って署名しそこで得た signature と block number を用いてどの NFT を移動させるのか決めて transfer を実行します。

ERC-721 の \_transfer は openzeppelin の実装を見る限り最初にいかのように tokenId の owner が from の address と同じかどうかを確認しています。このサンプル実装では from に対して `ownerOf(tokenId)` をいれているので、この require には 100%引っかかりません。このことから scan をできれば owner の意思に関係なく、NFT を盗むことができます。しかし transferFrom が禁止されているため、その NFT をまた別の wallet にうつしたり、マーケットプレイスに出品したりできないし、もう一度現物の所有者が scan を行えば NFT は所有者の元に帰ってきます。これらのことからただ gas 代を払うだけになってしまうので、NFT だけ盗んでも意味がないような設計になっているという見方ができます。
PBT ではものが中心の世界なため、ものを配送して新しい所有者になった時、その所有者が元の所有者の意思に関係なく scan をすることで NFT を手元へ持ってこれるようにするため、このような実装になっているのかなと推察します。

```solidity
require(ERC721.ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");
```

## セキュリティーへの配慮

`transferTokenWithChip` に渡される署名は EIP-191 署名になっており、署名データ内に関数の呼び出し元のアドレス(msg.sender)が必要になるため、リプレイ攻撃で署名が悪用されることはありません。
また悪意のあるチップの所有者が短期間後に使用する署名を事前に生成できないように直近のブロックハッシュを必要としています。

# Azuki の GoldenSkateboard の 実装を読む

![](https://azk.imgix.net/shao2.jpg)

Azuki は GoldenSkateboard 以外にもパーカーなど PBT をすでに販売していますが、今回はスケボーの PBT の実装を読んでみます。
etherscan で確認できますが GoldenSkateboard の EIP-5791 実装は以下の実装になります。

https://etherscan.io/address/0x6853449a65b264478a4cd90903a65f0508441ac0#code

基本的には上記で見てきた PBTSimple.sol を継承してるだけのコントラクトなのでシンプルです。mint の実装だけ行っていたのでそこだけ読んでいきます。

```solidity
function mintSkateboard(bytes calldata signatureFromChip, uint256 blockNumberUsedInSig) external {
  if (!canMint) {
    revert MintNotOpen();
  }

  if (supply == TOTAL_SUPPLY) {
    revert TotalSupplyReached();
  }

  _mintTokenWithChip(signatureFromChip, blockNumberUsedInSig);

  unchecked {
    ++supply;
  }
}
```

`_mintTokenWithChip` を読んでいるだけで、あとは総量の管理はこの継承したコントラクトで行っているためその実装だけ存在します。

```solidity
function _mintTokenWithChip(bytes calldata signatureFromChip, uint256 blockNumberUsedInSig) internal returns (uint256) {
  TokenData memory tokenData = _getTokenDataForChipSignature(signatureFromChip, blockNumberUsedInSig);
  uint256 tokenId = tokenData.tokenId;
  _mint(_msgSender(), tokenId);
  emit PBTMint(tokenId, tokenData.chipAddress);
  return tokenId;
}
```

単純に ERC-721 の `_mint` を実行してるだけです。 PBTMint event の emit だけする必要がありますが、チップをどうやって用意するんだよ！って問題だけ解決できれば PBT の実装自体はそんなに難しくなさそうですね。
