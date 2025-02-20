import express, { Request, Response,NextFunction } from 'express'
import { VoterSignInSchema, VoterSignupSchema, PartySignupSchema } from './schema.js';
import voterModel from './db.js'
import partyModel from './db.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { Storage } from '@google-cloud/storage'
import path from 'path'
import cors from 'cors'
import { generateVoterIdNumber, extractTextFromImage, getPublicGoogleUrl } from './functions.js';
import { middleware } from './middleware.js';
import cookieParser from 'cookie-parser'
import {ethers} from 'ethers'
import ContractAbi from '../ABIs/Voting.json' assert {type : "json"};
const app = express();
const PORT = 3000;
export const storage = new Storage({keyFilename : 'src/skilled-circle-448817-d1-e3457c9445ad.json'});
export const bucket = storage.bucket('votingbuck')
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors({credentials: true, origin: 'http://localhost:5173'}));
app.use(express.json());
app.use(cookieParser());
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const RPC_URL = process.env.RPC_URL;
const META_PRIVATE_KEY = process.env.META_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const MNEOMONICString :string = process.env.MNEOMONIC as string;
const MNEOMONIC = ethers.Mnemonic.fromPhrase(MNEOMONICString);
if(JWT_SECRET_KEY === undefined){
    throw new Error("JWT_SECRET_KEY is not defined");
}
if(RPC_URL === undefined){
    throw new Error("RPC_URL is not defined")
}
if(META_PRIVATE_KEY === undefined){
    throw new Error("META_PRIVATE_KEY is not defined")
}
if(CONTRACT_ADDRESS === undefined){
    throw new Error("CONTRACT_ADDRESS is not defined");
}
if(MNEOMONIC === undefined){
    throw new Error("MNEOMONIC is not defined");
}
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(META_PRIVATE_KEY,provider);

//voter routes
app.post('/api/v1/signup',async (req : Request,res : Response) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const dob = req.body.dateOfBirth;
    const address = req.body.address;
    const gender = req.body.gender;
    const idType = req.body.idType;
    const documentNumber = req.body.documentNumber;
    const selfieurl = req.body.selfieUrl;
    const documenturl = req.body.documentUrl;
    const mobile = req.body.mobile;
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    const parsedData = VoterSignupSchema.safeParse({
        firstName,
        lastName,
        dob,
        address,
        gender,
        idType,
        documentNumber,
        selfieurl,
        documenturl,
        mobile,
        username,
        password,
        email
    });
    if(!parsedData.success){
        res.status(401).json({message : "Invalid data", errors: parsedData.error.format()});
        return;
    }
    const bcryptPassword = await bcrypt.hash(password,10);
    let voterId = documentNumber.toString();
    if(idType === "Aadhar Card"){
        voterId =  generateVoterIdNumber(firstName,lastName,gender,documentNumber,mobile);
    }

    try {
        const existingUser = await voterModel.voterModel.findOne({
            $or: [{email}, { documentNumber }, { mobile }]
        });

        if (existingUser) {
             res.status(400).json({ message: "Email, Mobile or Document Number already exists" });
             return;
        }
        
        const response = await voterModel.voterModel.create({
            firstName,
            lastName,
            dateOfBirth : dob,
            address,
            gender,
            idType,
            documentNumber,
            selfieUrl: selfieurl,
            documentUrl: documenturl,
            mobile,
            username,
            password: bcryptPassword,
            email,
            voterId : voterId

        })
        const token = jwt.sign(voterId,JWT_SECRET_KEY);
        res.status(200).json({
            voterId,
            token,
            message : "User created successfully"
        })
    } catch (error) {
        res.status(500).json({message : "User not created"});
    }
});

app.post('/api/v1/signin',async (req : Request,res : Response) => {
    const data = req.body;
    const parsedData = VoterSignInSchema.safeParse(data);
    if(!parsedData.success){
        res.status(401).json({
            message : "Invalid data. Please check credentials"
        })
        return;
    }
    const {username , password} = data;
    const voterId = username;
    try {
        const voter = await voterModel.voterModel.findOne(
            {
                $or : [
                    {username},
                    {voterId}
                ]
            }
        );
        if(!voter){
            res.status(401).json({
                message : "No voter found. Please check you credentials"
             })
             return;
        }
        const isPasswordValid = await bcrypt.compare(password,voter.password);
        if(!isPasswordValid) {
            res.status(401).json({
                message : "Invalid password. Please try again!"
            });
            return;
        }

        const token = jwt.sign(voter.voterId,JWT_SECRET_KEY);
        res.status(200).json({
            token,
            message : "you are logged in successfully"
        })

    } catch (error) {
        res.status(401).json({
            message : "No voter found. Please register yourself first"
        })
        return;
    }

});

app.post('/api/v1/upload', upload.single('file'), async (req: Request, res : Response) => {
    if (!req.file) {
       res.status(400).send('No file uploaded');
       return;
    }
    
    const blob = bucket.file(Date.now() + path.extname(req.file.originalname));
    const blobStream = blob.createWriteStream({
      resumable: false,
    });
    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      res.status(200).send({ fileUrl: publicUrl });
    });
  
    blobStream.on('error', (err) => {
      res.status(500).send({ error: 'Something went wrong during file upload' });
    });
  
    blobStream.end(req.file.buffer);
  });
  
app.post('/api/v1/emailcheck', async (req : Request,res : Response) => {
    const email = req.body.email;
    const user = await voterModel.voterModel.findOne({email});
    if(!user){
        res.status(200).json({
            email : null
        })
        return;
    }
    res.status(300).json({
        email : user.email
    })
  });

app.post('/api/v1/verify', async (req : Request,res : Response) => {
        try {
            const voterId = req.body.voterId;
            const file = req.body.file;
            if (!voterId || !file) {
                res.status(400).json({ message: "Missing voterId or file" });
                return;
            }
            // const fileUrl = await getPublicGoogleUrl(file);
            const extractedText = await extractTextFromImage(file);
            if (!extractedText) {
                res.status(400).json({ message: "Failed to extract text" });
                return;
              }
            const voter = await voterModel.voterModel.findOne({voterId});
            if(!voter){
                  res.status(401).json({
                      message : "No voter found"
                  })
                  return;
                }
            
            const fullName = `${voter.firstName} ${voter.lastName}`.toLowerCase().trim();
            const dateOfBirth = voter.dateOfBirth.toString().toLowerCase().trim();
            const gender = voter.gender.toLowerCase().trim();
            const document = voter.documentNumber.toString().trim();
            let documentNumbers = [];  
            for (let i = 0; i < document.length; i += 4) {  
                documentNumbers.push(document.slice(i, i + 4));  
            }
            const extractedTextLower = extractedText.toLowerCase();
            if(!extractedTextLower.includes(fullName)){
                res.status(401).json({
                    message: "Voter name is not verfied",
                    verified: false,
                  });
                  return;
            }
            if(!extractedTextLower.includes(dateOfBirth)){
                res.status(401).json({
                    message: "Voter date of birth is not verfied",
                    verified: false,
                  });
                  return;
            }
            if(!extractedTextLower.includes(gender)){
                res.status(401).json({
                    message: "Voter gender is not verfied",
                    verified: false,
                  });
                  return;
            }
            if(!extractedTextLower.includes(documentNumbers[0])
            || !extractedTextLower.includes(documentNumbers[1])
            || !extractedTextLower.includes(documentNumbers[2])){
                res.status(401).json({
                    message: "Voter document number is not verfied",
                    verified: false,
                  });
                  return;
            }
            await voterModel.voterModel.updateOne({
               voterId : voterId
            },{
                $set: { verified: true }
            })
            
            res.status(200).json({
                message: "Voter is verified",
                verified: true,
              });
              return;
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
            return;
        }
        
    })

app.get('/api/v1/getVoter',middleware ,async(req: Request, res: Response) => {
        const voterId = req.body.voterId;
        if(!voterId){
            res.status(401).json({
                message : "User not logged in"
            })
            return;
        }
        try {
            const voter = await voterModel.voterModel.findOne({voterId});
            if(!voter){
                res.status(401).json({
                    message : "No voter found"
                })
                return;
            }
            res.status(200).json({
                voter
            })
            return;
        } catch (error) {
             res.status(500).json({
                message : "Internal server error"
             })
             return;
        }
})

app.post('/api/v1/getPublicUrl', async (req : Request,res : Response) => {
    const file = req.body.file;
    if(!file){
        res.status(401).json({
            message : "No file provided"
        })
        return;
    };
    const url = await getPublicGoogleUrl(file);
    if(!url){
        res.status(401).json({
            message : "No url found"
        })
        return;
    };
    res.status(200).json({
        url
    })
    return;
})

// party routes
app.post('/api/v2/signup', async (req : Request , res : Response) => {
    const partyName = req.body.partyName;
    const partyAbbreviation = req.body.partyAbbreviation;
    const dateOfBirth = req.body.dateOfBirth;
    const address = req.body.address;
    const gender = req.body.gender;
    const idType = req.body.idType;
    const documentNumber = req.body.documentNumber;
    const symbolUrl = req.body.symbolUrl;
    const documentUrl = req.body.documentUrl;
    const mobile = req.body.mobile;
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    const partyLeaderName = req.body.partyLeaderName;
    const manifesto = req.body.manifesto;
    const partyConstitution = req.body.partyConstitution;
    const parsedData = PartySignupSchema.safeParse({
        partyName,
        partyAbbreviation,
        dateOfBirth,
        address,
        gender,
        idType,
        documentNumber,
        symbolUrl,
        documentUrl,
        mobile,
        username,
        password,
        email,
        partyLeaderName,
        manifesto,
        partyConstitution
    });
    if(!parsedData.success){
        res.status(401).json({message : "Invalid data", errors: parsedData.error.format()});
        return;
    }
    const bcryptPassword = await bcrypt.hash(password,10);
    let voterId = documentNumber.toString();
    if(idType === "Aadhar Card"){
        voterId =  generateVoterIdNumber(partyName,partyAbbreviation,gender,documentNumber,mobile);
    }

    try {
        const existingUser = await partyModel.partyModel.findOne({
            $or: [{email}, { documentNumber }, { mobile }]
        });

        if (existingUser) {
             res.status(400).json({ message: "Email, Mobile or Document Number already exists" });
             return;
        }
        
        const response = await partyModel.partyModel.create({
            partyName,
            partyAbbreviation,
            dateOfBirth,
            address,
            gender,
            idType,
            documentNumber : Number(documentNumber),
            symbolUrl,
            documentUrl,
            mobile,
            username,
            password: bcryptPassword,
            email,
            partyLeaderName,
            voterId : voterId,
            manifesto,
            partyConstitution

        })
        const token = jwt.sign(voterId,JWT_SECRET_KEY);
        res.status(200).json({
            voterId,
            token,
            message : "Party register successfully"
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({message : "party not created"});
    }
})


// contract routes
app.post('/api/v3/startElection', async (req : Request, res: Response) =>{
    const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi,wallet);
    try {
        const transaction = await contract.startElection();
        await transaction.wait();
        res.status(200).json({
            message : "Election started successfully"
        })
    } catch (error) {
        res.status(500).json({
            message: "Election not started"
        })
        return;
    }
})

app.post('/api/v3/endElection', async (req : Request, res: Response) =>{
    const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi,wallet);
    try {
        const transaction = await contract.endElection();
        await transaction.wait();
        contract.once("ElectionEnded",(winningPartyId, winningPartyName, highestVotes) =>{
            res.status(200).json({
                message : "Election ended successfully",
                winningPartyId : winningPartyId.toString(),
                winningPartyName : winningPartyName,
                highestVotes : highestVotes.toString()
            })
        })
        return;
    } catch (error) {
        res.status(500).json({
            message: "Election not ended"
        })
        console.log(error)
        return;
    }
})

app.post('/api/v3/resetElection', async (req : Request, res: Response) =>{
    const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi,wallet);
    try {
        const transaction = await contract.endElection();
        await transaction.wait();
        res.status(200).json({
            message : "Election reset successfully"
        })
        return;
    } catch (error) {
        res.status(500).json({
            message: "Election not reseted"
        })
        console.log(error)
        return;
    }
})

app.post('/api/v3/addParty',middleware, async (req :Request , res: Response) => {
    const voterId = req.body.voterId;
    const partyName = req.body.partyName;
    try {
        
        const response = await partyModel.partyModel.findOne({voterId});
        if (!response) {
            res.status(404).json({ message: "Party not found" });
            return;
        }
        const partyIndex = response.partyIndex;
        const hdNode = ethers.HDNodeWallet.fromMnemonic(MNEOMONIC,`m/44'/60'/0'/0/${partyIndex}`)
        const privateKey = hdNode.privateKey;
        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi,signer);
        const transaction = await contract.addParty(partyName);
        await transaction.wait();
        contract.once("PartyAdded", async (totalParties, _name)=> {
            const updatedParty = await partyModel.partyModel.findOneAndUpdate(
                { voterId },
                { $set: { partyId: totalParties.toString() } },
                { new: true }
            );
            if(!updatedParty){
                res.status(500).json({ message: "Party ID not updated successfully" });
                return;
            }
            res.status(200).json({
                message : "Party added successfully",
                partyId : totalParties,
                name : _name
            })
        })
        return;
    } catch (error) {
        res.status(500).json({
            message : "Party not added"
        })
        return;
    }
})

app.post('/api/v3/removeParty',middleware, async (req: Request, res : Response) => {
    const voterId = req.body.voterId;
    try {
        const party = await partyModel.partyModel.findOne({voterId});
        if(!party){
            res.status(404).json({
                message : "Party not found"
            });
            return;
        }
        const partyIndex = party.partyIndex;
        const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi,wallet);
        const transaction = await contract.removeParty(partyIndex);
        await transaction.wait();
        contract.once("PartyRemoved",(_partyId) => {
            if(!_partyId){
                res.status(500).json({
                    message : "Party not found/removed"
                })
            }
            res.status(200).json({
                message : "Party removed successfully",
                partyId : _partyId
            })
        })
        return;
    } catch (error) {
        res.status(500).json({
            message: "Party not removed successfully"
        })
        return;
    }
})

app.post('/api/v3/registerVoter',middleware, async (req : Request, res : Response) => {
    const voterId = req.body.voterId;
    try {
        const voter = await voterModel.voterModel.findOne({voterId});
        if(!voter){
            res.status(404).json({
                message : "Voter not found"
            })
            return;
        }
        const voterIndex = voter?.voterIndex;
        if(!voterIndex){
            res.status(404).json({
                message : "voter Index not found"
            })
            return;
        }
        const hdNode = ethers.HDNodeWallet.fromMnemonic(MNEOMONIC,`m/44'/60'/0'/0/${voterIndex}`);
        const privateKey = hdNode.privateKey;
        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi,signer);
        const transaction = await contract.registerVoter(privateKey);
        await transaction.wait();
        contract.once("VoterRegisterd",(_voter) => {
            res.status(200).json({
                message : "Voter registerd successfully",
                voter : _voter
            })
        })
        return;

    } catch (error) {
        res.status(500).json({
            message : "Voter not registerd"
        })
        return;
    }
})

app.post('/api/v3/blockVoter', async(req : Request, res : Response) => {
    const voterId = req.body.voterId;
    try {
        const voter = await voterModel.voterModel.findOne({voterId});
        if(!voter){
            res.status(404).json({
                message : "voter not found"
            })
            return;
        }
        const voterIndex = voter.voterIndex;
        const hdNode = ethers.HDNodeWallet.fromMnemonic(MNEOMONIC,`m/44'/60'/0'/0/${voterIndex}`);
        const privateKey = hdNode.privateKey;
        const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi, wallet);
        const transaction = await contract.blockVoter(privateKey);
        await transaction.wait();
        contract.once("VoterBlocked",(_voter) => {
            if(!_voter){
                res.status(500).json({
                    message : "Voter not blocked/registerd"
                })
                return;
            }
            res.status(200).json({
                message : "Voter blocked successfully",
                voter : _voter
            })
        })
        return;
    } catch (error) {
        res.status(500).json({
            message : "Voter not blocked"
        })
        return;
    }
})

app.post('/api/v3/unblockVoter', async(req : Request , res : Response) => {
    const voterId = req.body.voterId;
    try {
        const voter = await voterModel.voterModel.findOne({voterId});
    if(!voter){
        res.status(404).json({
            message : "Voter not found"
        })
        return;
    }
    const voterIndex = voter.voterIndex;
    const hdNode = ethers.HDNodeWallet.fromMnemonic(MNEOMONIC,`m/44'/60'/0'/0/${voterIndex}`);
    const privateKey = hdNode.privateKey;
    const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi, wallet);
    const transaction = await contract.unblockVoter(privateKey);
    await transaction.wait();
    contract.once("VoterUnblocked",(_voter) => {
        if(!_voter){
            res.status(500).json({
                message : "Voter not unblocked/registerd"
            })
            return;
        }
        res.status(200).json({
            message : "Voter unblocked successfully",
            voter : _voter
        })
    })
    return;
    } catch (error) {
        res.status(500).json({
            message : "Voter not unblocked"
        })
        return;
    }
})

//token management
app.post('/api/v3/mintToken', async(req : Request, res : Response) => {
    const voterId = req.body.voterId;
    try {
        const voter = await voterModel.voterModel.findOne({voterId});
        if(!voter){
            res.status(404).json({
                message : "Voter not found"
            })
            return;
        }
        const voterIndex = voter.voterIndex;
        const hdNode = ethers.HDNodeWallet.fromMnemonic(MNEOMONIC,`m/44'/60'/0'/0/${voterIndex}`);
        const privateKey = hdNode.privateKey;
        const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi, wallet);
        const transaction = await contract.mintTokens(privateKey);
        await transaction.wait();
        contract.once("TokenMined",(_voter,amount) => {
            if(amount === undefined || amount === 0){
                res.status(500).json({
                    message : "Token not minted/not registered"
                })
                return;
            }
            res.status(200).json({
                message : "Token minted successfully",
                voter : _voter,
                amount : amount
            })
        })
        return;
    } catch (error) {
        res.status(500).json({
            message : "Token not minted"
        })
        return;
    }   

})

app.post('/api/v3/distributeTokens', async(req : Request, res : Response) => {
    try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi, wallet);
        const voterAddresses = await contract.voterAddresses;
        const transaction = await contract.distributeTokens(voterAddresses)
        await transaction.wait();
        contract.once("TokensDistributed",(_voterAddress,amount) => {
            if(amount === undefined || amount === 0){
                res.status(500).json({
                    message : "Tokens not distributed"
                })
                return;
            }
            res.status(200).json({
                message : "Tokens distributed successfully",
                voterAddress : _voterAddress,
                amount : amount
            })
            
        })
        return;
    } catch (error) {
        res.status(500).json({
            message : "Tokens not distributed successfully"
        })
        return;
    }
})

//voting

app.post('/api/v3/vote', async(req : Request, res : Response) => {
    const voterId = req.body.voterId;
    const partyId = req.body.partyId;
    try {
        const voter = await voterModel.voterModel.findOne({voterId});
        if(!voter){
            res.status(404).json({
                message : "Voter not found"
            })
            return;
        };
        const party = await partyModel.partyModel.findOne({partyId});
        if(!party){
            res.status(404).json({
                message : "Party not found"
            });
            return;
        }
        const voterIndex = voter.voterIndex;
        const partyChainId = party.partyId
        const hdNode = ethers.HDNodeWallet.fromMnemonic(MNEOMONIC,`m/44'/60'/0'/0/${voterIndex}`);
        const privateKey = hdNode.privateKey;
        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi, signer);
        const transaction = await contract.vote(partyChainId);
        await transaction.wait();
        contract.once("Voted",(voter, partyId) => {
            res.status(200).json({
                message : "Voted successfully",
                voter : voter,
                partyId : partyId
            })
        })
        return;

    } catch (error) {
        res.status(500).json({
            message : "Voter not voted successfully"
        })
        return;
    }
})

app.get('/api/v3/PartyVotes', async (req : Request, res : Response) => {
    const partyId = req.body.partyId;
    try {
        const party = await partyModel.partyModel.findOne({partyId});
        if(!party){
            res.status(404).json({
                message : "Party not found"
            });
            return;
        }
        const partyChainId = party.partyId
        const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi, wallet);
        const votes = await contract.getPartyVotes(partyChainId);
        res.status(200).json({
            message : "Get votes successfully",
            votes : votes
        })
        return;
    } catch (error) {
        res.status(500).json({
            message : "Votes not fetched successfully"
        })
        return;
    }
})

app.get('/api/v3/VoterStatus',middleware, async (req : Request , res : Response) => {
    const voterId = req.body.voterId;
    try {
        const voter = await voterModel.voterModel.findOne({voterId});
        if(!voter) {
            res.status(404).json({
                message : "Voter not found"
            })
            return;
        }
        const voterIndex = voter.voterIndex
        const hdNode = ethers.HDNodeWallet.fromMnemonic(MNEOMONIC,`m/44'/60'/0'/0/${voterIndex}`);
        const privateKey = hdNode.privateKey;
        const contract = new ethers.Contract(CONTRACT_ADDRESS,ContractAbi.abi, wallet);
        const {isRegistered, isBlocked, hasVoted , allocatedToken} = await contract.getVoterStatus(privateKey)
        res.status(200).json({
            message : "Voter status fetched successfully",
            isRegistered,
            isBlocked,
            hasVoted,
            allocatedToken
        });
        return;
    } catch (error) {
        res.status(500).json({
            message : "Voter status not fetched successfully"
        })
        return;
    }
})
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//forge create --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 src/Voting.sol:Voting --broadcast
