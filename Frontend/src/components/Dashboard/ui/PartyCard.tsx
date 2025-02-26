import {PartyListProps} from './PartyList'
import { MicVocal, MapPin, PersonStanding  } from "lucide-react"
type partyCardProbs = {
    party : PartyListProps;
    onClick : () => void;
}
// _id: number
//     partyName: string
//     partyAbbreviation: string
//     address: string
//     partyLeaderName: string
//     symbolUrl: string
export default function PartyCard ({party, onClick} : partyCardProbs) {

    return (
        <div className= "bg-purple-800 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer p-4" onClick={onClick}>
            <img src={party.symbolUrl || "/placeholder.svg"}
                        alt={party.partyAbbreviation}
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover" />
            <div className='p-6'>
                <h2 className='text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600'>
                    {party.partyName};
                </h2>
            </div>
            <div className='flex items-center mb-2'>
                <MicVocal className="w-4 h-4 mr-2 text-purple-400" />
                <span>{party.partyAbbreviation}</span>
            </div>
            <div className='flex items-center mb-2'>
                <MapPin className="w-4 h-4 mr-2 text-purple-400" />
                <span>{party.address}</span>
            </div>
            <div className="flex items-center">
                <PersonStanding className="w-5 h-5 mr-2 text-purple-400" />
                <span>{party.partyLeaderName} attendees</span>
            </div>
        </div>
    )
}