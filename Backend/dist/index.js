var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from 'express';
import { VoterSignInSchema } from './schema';
import voterModel from '../../Database/src/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET_KEY } from './config';
const app = express();
const PORT = 3000;
app.use(express.json());
const generateVoterIdNumber = (firstName, lastName, gender, documentNumber, mobile) => {
    const AadharNumber = documentNumber.toString().slice(-4);
    const phoneNumber = mobile.toString().slice(5, 8);
    const firstLetter = firstName.charAt(2).toUpperCase();
    const secondLetter = lastName.charAt(1).toUpperCase();
    const thirdLetter = gender.charAt(0).toUpperCase();
    let voterID = thirdLetter + secondLetter + firstLetter;
    let i = 0, j = 0;
    while (i < AadharNumber.length && j < phoneNumber.length) {
        voterID += AadharNumber[i];
        voterID += phoneNumber[j];
        i++;
        j++;
    }
    while (i < AadharNumber.length) {
        voterID += AadharNumber[i];
        i++;
    }
    while (j < phoneNumber.length) {
        voterID += phoneNumber[j];
        j++;
    }
    return voterID;
};
app.post('/api/v1/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    const email = req.body.email;
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
    if (!parsedData.success) {
        res.status(401).json({ message: "Invalid data", errors: parsedData.error.format() });
        return;
    }
    const bcryptPassword = yield bcrypt.hash(password, 10);
    let voterId = documentNumber.toString();
    if (idType === "Aadhar Card") {
        voterId = generateVoterIdNumber(firstName, lastName, gender, documentNumber, mobile);
    }
    try {
        const response = yield voterModel.voterModel.create({
            firstName,
            lastName,
            dob,
            address,
            gender,
            idType,
            documentNumber,
            selfieUrl: selfieurl,
            documentUrl: documenturl,
            mobile,
            username,
            password: bcryptPassword,
            email: email,
            voterId: voterId
        });
        const token = jwt.sign(voterId, JWT_SECRET_KEY);
        res.json({
            token,
            message: "User created successfully"
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "User not created" });
    }
}));
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
