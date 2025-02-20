import { X, Calendar, MapPin, Users } from "lucide-react"
import { PartyListProps } from './PartyList'

type PartyModelprops = {
    party : PartyListProps;
    onClose : () => void;
}

export default function PartyModel({ party, onClose }: PartyModelprops) {
        return(
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-purple-800 rounded-lg overflow-hidden shadow-2xl w-full max-w-2xl animate-fade-in">
        <div className="relative">
          <img
            src={party.imageUrl || "/placeholder.svg"}
            alt={party.name}
            width={800}
            height={400}
            className="w-full h-64 object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-purple-900 text-white p-2 rounded-full hover:bg-purple-700 transition-colors duration-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <h2 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            {party.name}
          </h2>
          <div className="flex items-center mb-2">
            <Calendar className="w-5 h-5 mr-2 text-purple-400" />
            <span>{party.date}</span>
          </div>
          <div className="flex items-center mb-2">
            <MapPin className="w-5 h-5 mr-2 text-purple-400" />
            <span>{party.location}</span>
          </div>
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 mr-2 text-purple-400" />
            <span>{party.attendees} attendees</span>
          </div>
          <p className="text-gray-300">{party.description}</p>
        </div>
      </div>
    </div>
        )
}