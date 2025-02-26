import express, { Request, Response} from 'express'
import { VoterSignInSchema, VoterSignupSchema, PartySignupSchema , PartySigninSchema } from './schema.js';
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
import { addParty, blockVoter, distributeTokens, endElection, getPartyStatus, getTotalParties, getTotalVoters, getTotalVotes, getVoterAddresses, getVoterStatus, mintTokens, registerVoter, removeParty, resetElection, results, startElection, unblockVoter, vote } from './contract.js';
import { PythonShell } from "python-shell";
const app = express();
const PORT = 3000;
export const storage = new Storage({keyFilename : 'src/skilled-circle-448817-d1-e3457c9445ad.json'});
export const bucket = storage.bucket('votingbuck')
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors({credentials: true, origin: 'http://localhost:5173'}));
app.use(express.json());
app.use(cookieParser());
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
if(JWT_SECRET_KEY === undefined){
    throw new Error("JWT_SECRET_KEY is not defined");
}
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
app.post('/api/v1/verifyVoter', async(req : Request, res: Response) => {
    const voterId = req.body.voterId;
    try {
        const voter = await voterModel.voterModel.findOne({voterId});
        if(!voter){
            res.status(401).json({
                message : "No voter found"
            })
            return;
        }
        const file = voter.selfieUrl;
        const signedFile = await getPublicGoogleUrl(file);
        res.status(300).json({
            signedFile : signedFile
        })
        const options : any = {
            mode : "text",
            pythonPath: "D:\\Programs\\python.exe",
            scriptPath: "./dist/",
            args: [signedFile],
        }
        const pythonScript = await PythonShell.run("voterVerification.py",options);
        if(!pythonScript){
            res.status(500).json({
                message : "Error in pythonScript"
            })
            return;
        }
        res.status(200).json({
            message : "Voter verified successfully"
        })

    } catch (error) {
        res.status(500).json({
            message : "Internal server error"
        })
    }
})
app.put('/api/v1/updateUrl',middleware,async(req : Request , res : Response) => {
    const { voterId, label, value: file } = req.body;
    if (!voterId) {
        res.status(400).json({ message: "No voterId provided" });
        return;
    }
    if (!label) {
        res.status(400).json({ message: "No label provided" });
        return;
    }
    const formattedLabel = label.toLowerCase().split(' ')[0];
    const fieldToUpdate = formattedLabel + "Url";
    try {
        const updatedVoter = await voterModel.voterModel.findOneAndUpdate({
            voterId
        }, {
            $set : {
                [fieldToUpdate]: file
            }
        },{
            new : true
        })
        if(!updatedVoter){
            res.status(401).json({
                message : "No voter found"
            });
            return;
        }
        res.status(200).json({
            message : "Url updated successfully",
            UpdatedUrl : updatedVoter
        })
    } catch (error) {
        res.status(500).json({
            message : "Internal server error",
            error : error
        })
    }
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
app.post('/api/v2/signin', async (req : Request, res : Response) => {
    const data = req.body;
    const parsedData = PartySigninSchema.safeParse(data);
    if(!parsedData.success){
        res.status(401).json({
            message : "Invalid data. Please check credentials"
        })
        return;
    }
    const {username , password} = data;
    const voterId = username;
    try {
        const party = await partyModel.partyModel.findOne(
            {
                $or : [
                    {username},
                    {voterId}
                ]
            }
        );
        if(!party){
            res.status(401).json({
                message : "No party found. Please check you credentials"
             })
             return;
        }
        const isPasswordValid = await bcrypt.compare(password,party.password);
        if(!isPasswordValid) {
            res.status(401).json({
                message : "Invalid password. Please try again!"
            });
            return;
        }

        const token = jwt.sign(party.voterId,JWT_SECRET_KEY);
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
})

// contract routes

app.post('/api/v3/startElection', async (req : Request, res: Response) =>{
    const duration = req.body.duration;
    try {
        const transaction = await startElection(Number(duration));
        res.status(200).json({
            message : "Election started successfully",
            transactionHash : transaction
        })
    } catch (error) {
        res.status(500).json({
            message: "Election not started",
            error : error
        })
        return;
    }
})
app.post('/api/v3/endElection', async (req : Request, res: Response) =>{
    try {
        const transaction = await endElection();
        res.status(200).json({
            message : "Election ended successfully",
            transactionHash : transaction
        })
    } catch (error) {
        res.status(500).json({
            message: "Election not ended",
            error : error
        })
        return;
    }
})
app.get('/api/v3/results', async (req : Request , res : Response) => {
    try {
        const transaction = await results()
        res.status(200).json({
            message : "Results fetched successfully",
            winningPartyId : transaction.winningPartyId, 
            winningPartyName : transaction.winningPartyName, 
            highestVotes :transaction.highestVotes
        })
    } catch (error) {
        res.status(500).json({
            message : "Resuls not fetched",
            error : error
        })
        return;
    }
})
app.post('/api/v3/resetElection', async (req : Request, res: Response) =>{
    try {
        const transaction = await resetElection();
        res.status(200).json({
            message : "Election reset successfully",
            transactionHash : transaction
        })
    } catch (error) {
        res.status(500).json({
            message: "Election not reseted",
            error : error
        })
        return;
    }
})
app.post('/api/v3/addParty', async (req :Request , res: Response) => {
    const partyId = req.body.partyId;
    const partyName = req.body.partyName;
    try {
        const party = await partyModel.partyModel.findOne(
            {
                voterId : partyId
            }
        )
        if(!party){
            res.status(400).json({
                message : "Party not found"
            })
            return;
        }
        const partyIndex = party.partyIndex;
        if(!partyIndex){
            res.status(400).json({
                message : "Party index not found"
            })
            return;
        }
        const transaction = await addParty(partyIndex,partyName);
        res.status(200).json({
            message : "Party added successfully",
            transactionHash : transaction
        })
    } catch (error) {
        res.status(500).json({
            message : "Party not added",
            error : error
        })
        return;
    }
})
app.post('/api/v3/removeParty',async (req: Request, res : Response) => {
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
        if(!partyIndex){
            res.status(404).json({
                message : "Party index not found"
            })
            return;
        }
        const transaction = await removeParty(partyIndex);
        res.status(200).json({
            message : "Party removed successfully",
            transactionHash : transaction
        })
    } catch (error) {
        res.status(500).json({
            message: "Party not removed successfully",
            error : error
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
        const voterIndex = voter.voterIndex;
        if (voterIndex === undefined || voterIndex === null) {
             res.status(404).json({ message: "Voter index not found" });
             return;
        }
        const transaction = await registerVoter(voterIndex);
        res.status(200).json({
            message : "Voter registered successfully",
            transactionHash : transaction
        })
    } catch (error) {
        res.status(500).json({
            message : "Voter not registerd",
            error : error
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
        if(!voterIndex){
            res.status(404).json({
                message : "Voter index not found"
            })
            return;
        }
        const transaction = await blockVoter(voterIndex);
        res.status(200).json({
            message : "Voter blocked successfully",
            transactionHash : transaction
        })
    } catch (error) {
        res.status(500).json({
            message : "Voter not blocked",
            error : error
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
        if(!voterIndex){
            res.status(404).json({
                message : "Voter index not found"
            })
            return;
        }
        const transaction = await unblockVoter(voterIndex);
        res.status(200).json({
            message : "Voter unblocked successfully",
            transactionHash : transaction
        })
    }catch (error) {
        res.status(500).json({
            message : "Voter not unblocked",
            error : error
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
        if(!voterIndex){
            res.status(404).json({
                message : "Voter index not found"
            })
            return;
        }
        const transaction = await mintTokens(voterIndex);
        res.status(200).json({
            message : "Token minted successfully",
            transactionHash : transaction
        })
    } catch (error) {
        res.status(500).json({
            message : "Token not minted",
            error : error
        })
        return;
    }   

})
app.post('/api/v3/distributeTokens', async(req : Request, res : Response) => {
    try {
        const transaction = await distributeTokens();
        res.status(200).json({
            message : "Tokens distributed successfully",
            transactionHash : transaction
        })
    } catch (error) {
        res.status(500).json({
            message : "Tokens not distributed successfully",
            error : error
        })
        return;
    }
})

//voting

app.post('/api/v3/vote',middleware, async(req : Request, res : Response) => {
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
        const party = await partyModel.partyModel.findOne({voterId : partyId});
        if(!party){
            res.status(404).json({
                message : "Party not found"
            });
            return;
        }
        const voterIndex = voter.voterIndex;
        const partyChainId = party.partyIndex;
        if(voterIndex === undefined || voterIndex === null || partyChainId === undefined || partyChainId === null){
            res.status(404).json({
                message : "Voter index or party chain id not found"
            })
            return;
        }
        const transaction = await vote(partyChainId, voterIndex);
        res.status(200).json({
            message : "Voted successfully",
            transactionHash : transaction
        })
    } catch (error) {
        res.status(500).json({
            message : "Voter not voted successfully",
            error : error
        })
        return;
    }
})

//helper functions

app.get('/api/v3/partyStatus', async (req : Request, res : Response) => {
    const partyId = req.query.partyId;
    if (!partyId) {
        res.status(400).json({ message: "Missing partyId parameter" });
        return;
    }
    try {
        const party = await partyModel.partyModel.findOne({voterId : partyId});
        if(!party){
            res.status(404).json({
                message : "Party not found"
            });
            return;
        }
        const partyIndex = Number(party.partyIndex)
        if (isNaN(partyIndex)) {
            res.status(400).json({ message: "Invalid party index" });
            return
        }
        const transaction = await getPartyStatus(partyIndex);
        console.log("transaction",transaction)
        res.status(200).json({
            message : "Get status successfully",
            id : transaction.id,
            name : transaction.name,
            voteCount : transaction.voteCount,
            exists : transaction.exists
        })
    } catch (error) {
        res.status(500).json({
            message : "Votes not fetched successfully",
            error : error
        })
        return;
    }
})
app.get('/api/v3/voterStatus',middleware, async (req : Request , res : Response) => {
    const voterId = req.query.voterId as string;
    try {
        const voter = await voterModel.voterModel.findOne({voterId});
        if(!voter) {
            res.status(404).json({
                message : "Voter not found"
            })
            return;
        }
        const voterIndex = voter.voterIndex
        if(!voterIndex){
            res.status(404).json({
                message : "Voter index not found"
            })
            return;
        }
        const transaction = await getVoterStatus(voterIndex);
        res.status(200).json({
            message : "Voter status fetched successfully",
            isRegistered : transaction.isRegistered,
            isBlocked : transaction.isBlocked,
            hasVoted : transaction.hasVoted,
            allocatedTokens : transaction.allocatedTokens
        });
    } catch (error) {
        res.status(500).json({
            message : "Voter status not fetched successfully",
            error : error
        })
        return;
    }
})
app.get('/api/v3/totalVotes', async (req : Request, res : Response) => {
    try {
        const transaction = await getTotalVotes();
        res.status(200).json({
            message : "Total votes fetched successfully",
            totalVotes : transaction
        })
    } catch (error) {
        res.status(500).json({
            message : "Total votes not fetched successfully",
            error : error
        })
        return;
    }
})
app.get('/api/v3/totalVoters', async (req : Request, res : Response) => {
    try {
        const transaction = await getTotalVoters();
        res.status(200).json({
            message : "Total voters fetched successfully",
            totalVoters : transaction
        })
    } catch (error) {
        res.status(500).json({
            message : "Total voters not fetched successfully",
            error : error
        })
        return;
    }
})
app.get('/api/v3/totalParties', async (req : Request , res : Response) => {
    
    try {
        const transaction = await getTotalParties();
        res.status(200).json({
            message : "Total parties fetched successfully",
            totalParties : transaction
        })
    } catch (error) {
        res.status(500).json({
            message : "Total parties not fetched successfully",
            error : error
        })
        return;
    }
})
app.get('/api/v3/voterAddresses', async(req : Request, res : Response) => {
    try {
        const transaction = await getVoterAddresses();
        res.status(200).json({
            message : "Voter addresses fetched successfully",
            voterAddresses : transaction
        })
    } catch (error) {
        res.status(500).json({
            message : "Voter addresses not fetched successfully",
            error : error
        })
    }

})
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//forge create --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 src/Voting.sol:Voting --broadcast
