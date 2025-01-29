import mongoose from 'mongoose'

 mongoose.connect("mongodb+srv://sanyamjainhbtu:Sm%40sterjain04@cluster0.rcz8e.mongodb.net/").then(
    () => {
        console.log("Database connected");
    }).catch((e) => {
        console.log("Database not connected", e);
    }
 );

const VoterSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    address: { type: String, required: true },
    gender: { type: String, required: true },
    idType: { type: String, required: true },
    documentNumber: { type: Number, required: true },
    selfieUrl: { type: String, required: true },
    documentUrl: { type: String, required: true },
    mobile: { type: Number, required: true },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    email: { type: String, unique: true},
    voterId : {type: String , required : true},
});

const PartySchema = new mongoose.Schema({
    partyName: { type: String, required: true },
    partyAbbreviation: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    address: { type: String, required: true },
    gender: { type: String, required: true },
    idType: { type: String, required: true },
    documentNumber: { type: Number, required: true },
    symbolUrl: { type: String, required: true },
    documentUrl: { type: String , required: true},
    mobile: { type: Number, required: true },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    voterId : {type: String , required : true},
    email: { type: String, unique: true},
    partyLeaderName: { type: String, required: true },
    manifesto: { type: String, required: true },
    partyConstitution: { type: String, required: true },
})

const voterModel = mongoose.model("Voter",VoterSchema);
const partyModle = mongoose.model("Party",PartySchema)

export default {
    voterModel,
    partyModle
}