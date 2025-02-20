import {PartyListProps} from './PartyList'
import { Calendar, MapPin, Users } from "lucide-react"
type partyCardProbs = {
    party : PartyListProps;
    onClick : () => void;
}
export default function PartyCard ({party, onClick} : partyCardProbs) {

    return (
        <div className= "bg-purple-800 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer p-4" onClick={onClick}>
            <img src={party.imageUrl || "/placeholder.svg"}
                        alt={party.name}
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover" />
            <div className='p-6'>
                <h2 className='text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600'>
                    {party.name};
                </h2>
            </div>
            <div className='flex items-center mb-2'>
                <Calendar className="w-4 h-4 mr-2 text-purple-400" />
                <span>{party.date}</span>
            </div>
            <div className='flex items-center mb-2'>
                <MapPin className="w-4 h-4 mr-2 text-purple-400" />
                <span>{party.location}</span>
            </div>
            <div className="flex items-center">
                <Users className="w-4 h-4 mr-2 text-purple-400" />
                <span>{party.attendees} attendees</span>
            </div>
        </div>
    )
}