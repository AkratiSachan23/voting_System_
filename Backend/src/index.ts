import express, { Request, Response,NextFunction } from 'express'
import { VoterSignInSchema } from './schema.js';
import voterModel from './db.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { Storage } from '@google-cloud/storage'
import path from 'path'
import cors from 'cors'
import { generateVoterIdNumber, extractTextFromImage, getPublicGoogleUrl } from './functions.js';


const app = express();
const PORT = 3000;
export const storage = new Storage({keyFilename : 'src/skilled-circle-448817-d1-e3457c9445ad.json'});
export const bucket = storage.bucket('votingbuck')
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());
app.use(express.json());

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
if(JWT_SECRET_KEY === undefined){
    throw new Error("JWT_SECRET_KEY is not defined");
}

app.post('/api/v1/signup',async (req : Request,res : Response) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const dob = req.body.dob;
    const address = req.body.address;
    const gender = req.body.gender;
    const idType = req.body.idType;
    const documentNumber = req.body.documentNumber;
    const selfieurl = req.body.selfieurl;
    const documenturl = req.body.documenturl;
    const mobile = req.body.mobile;
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email || undefined;
    const parsedData = VoterSignInSchema.safeParse({
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
        res.json({
            voterId,
            token,
            message : "User created successfully"
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({message : "User not created"});
    }
});

app.post('/api/v1/signin',async (req : Request,res : Response) => {
    const data = req.body;
    const parsedData = VoterSignInSchema.safeParse(data);
    if(!parsedData.success){
        res.status(401).json({
            message : "Invalid data"
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
        res.json({
            token,
            message : "User logged in successfully"
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
        console.log(err);
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
            const fileUrl = await getPublicGoogleUrl(file);
            const extractedText = await extractTextFromImage(fileUrl);
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
            let documentNumber = "";
            for(let i=0; i<document.length; i += 4){
                documentNumber += document.slice(i,i+4 ) + ' ';
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
            if(!extractedTextLower.includes(documentNumber)){
                res.status(401).json({
                    message: "Voter document number is not verfied",
                    verified: false,
                  });
                  return;
            }
            
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
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
