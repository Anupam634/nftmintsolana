import React, { useState } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import axios from "axios";
import idl from "./idl.json";
import "./App.css";

const programId = new PublicKey("GhiqJjg8sVy9ETnzyRBZxvpRaLPYxR71q7vR2U3DYJj8"); // Replace with your program ID
const network = clusterApiUrl("devnet"); 

const MintNFT = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isMinting, setIsMinting] = useState(false);
  const [nftDetails, setNftDetails] = useState({
    name: "",
    price: "",
    image: null,
  });
  const [ipfsUrl, setIpfsUrl] = useState("");
  const [mintedNft, setMintedNft] = useState(null); 

  const IPFS_API_KEY = "b17cd3c4251fc21e47ed"; 
  const IPFS_API_SECRET = "692b522e060586e1c025d5c209e3d2cc503a00f34b1e0b2f1e6eb7386a069d13"; 

  // Connect Phantom Wallet
  const connectWallet = async () => {
    const { solana } = window;
    if (solana && solana.isPhantom) {
      try {
        const response = await solana.connect();
        console.log("Wallet connected:", response.publicKey.toString());
        setWalletAddress(response.publicKey.toString());
      } catch (err) {
        console.error("Error connecting wallet:", err);
      }
    } else {
      alert("Please install the Phantom Wallet extension!");
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      setNftDetails({ ...nftDetails, image: files[0] });
    } else {
      setNftDetails({ ...nftDetails, [name]: value });
    }
  };

  // Upload image to IPFS
  const uploadToIpfs = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          pinata_api_key: IPFS_API_KEY,
          pinata_secret_api_key: IPFS_API_SECRET,
        },
      });
      const ipfsHash = res.data.IpfsHash;
      const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      console.log("Image uploaded to IPFS:", url);
      setIpfsUrl(url); // Update the IPFS URL
      return url;
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      alert("Failed to upload image to IPFS. Check the console for details.");
      throw error;
    }
  };
  const mintNft = async () => {
    const { name, price, image } = nftDetails;

    if (!walletAddress) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!name || !price || !image) {
      alert("Please fill in all the NFT details!");
      return;
    }

    setIsMinting(true);

    try {
      const metadataUrl = await uploadToIpfs(image);
      if (!metadataUrl) {
        throw new Error("Failed to upload image to IPFS.");
      }

      console.log("Metadata URL:", metadataUrl);

      const connection = new Connection(network, "confirmed");
      const provider = new AnchorProvider(
        connection,
        window.solana,
        AnchorProvider.defaultOptions()
      );
      const program = new Program(idl, programId, provider);

      const mint = web3.Keypair.generate(); // Generate a new mint address
      const tokenAccount = web3.Keypair.generate(); // Generate a new token account

      await program.rpc.mintNft(
        name, 
        "NFTSYM", 
        metadataUrl, 
        {
          accounts: {
            mint: mint.publicKey,
            tokenAccount: tokenAccount.publicKey,
            mintAuthority: walletAddress,
            user: walletAddress,
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID, 
            rent: web3.SYSVAR_RENT_PUBKEY,
          },
          signers: [mint, tokenAccount],
        }
      );

      alert(`NFT "${name}" Minted Successfully at price ${price} SOL!`);

      setMintedNft({
        name,
        price,
        imageUrl: metadataUrl,  
        mintAddress: mint.publicKey.toString(),
      });
    } catch (err) {
      console.error("Error minting NFT:", err);
      alert("Failed to mint NFT. Check the console for details.");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="App">
      <h1>Solana NFT Minting</h1>
      {!walletAddress ? (
        <button onClick={connectWallet} className="btn">
          Connect Wallet
        </button>
      ) : (
        <>
          <p>Wallet Connected: {walletAddress}</p>
          <div className="form">
            <input
              type="text"
              name="name"
              placeholder="NFT Name"
              value={nftDetails.name}
              onChange={handleChange}
            />
            <input
              type="text"
              name="price"
              placeholder="NFT Price (in SOL)"
              value={nftDetails.price}
              onChange={handleChange}
            />
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
            />
          </div>
          <button onClick={mintNft} className="btn" disabled={isMinting}>
            {isMinting ? "Minting..." : "Mint NFT"}
          </button>
        </>
      )}

      {/* Display minted NFT details */}
      {mintedNft && (
        <div className="minted-nft">
          <h2>Your Minted NFT</h2>
          <img src={mintedNft.imageUrl} alt="Minted NFT" />
          <p><strong>Name:</strong> {mintedNft.name}</p>
          <p><strong>Price:</strong> {mintedNft.price} SOL</p>
          <p><strong>Mint Address:</strong> {mintedNft.mintAddress}</p>
        </div>
      )}
    </div>
  );
};

export default MintNFT;
