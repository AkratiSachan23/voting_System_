import { X, ScrollText , MapPin, Users, BookText  } from "lucide-react"
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
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-purple-900 text-white p-2 rounded-full hover:bg-purple-700 transition-colors duration-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <h2 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            {party.partyName} ({party.partyAbbreviation})
          </h2>
          {/* <div className="flex items-center mb-2">
            <Calendar className="w-5 h-5 mr-2 text-purple-400" />
            <span>{party.partyAbbreviation}</span>
          </div> */}
          <div className="flex items-center mb-2">
            <MapPin className="w-5 h-5 mr-2 text-purple-400" />
            <span className="font-bold text-white mr-2">Address:</span>
            <span>{party.address}</span>
          </div>
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 mr-2 text-purple-400" />
            <span className="font-bold text-white mr-2">Leader:</span>
            <span>{party.partyLeaderName}</span>
          </div>
          <div className="flex  mb-2 justify-center">
            <ScrollText  className="w-7 h-7 mr-2 text-purple-400" />
            <span className="font-bold text-white mr-2">Manifesto:</span>
            <div></div>
            <span><a href={party.manifesto} className="hover:underline hover:cursor-pointer">A manifesto is a public declaration of a party's policies, goals, and plans, outlining its vision and promises to the people.</a></span>
          </div>
          <div className="flex justify-center mb-2">
            <BookText  className="w-7 h-7 mr-2 text-purple-400" />
            <span className="font-bold text-white mr-2">Constitution:</span>
            <span><a href={party.partyConstitution} className="hover:underline hover:cursor-pointer">A party constitution defines its ideology, leadership structure, membership rules, decision-making process, and operational guidelines.</a></span>
          </div>
        </div>
      </div>
    </div>
        )
}