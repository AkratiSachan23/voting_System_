import { useState } from "react"
import PartyCard from "./PartyCard"
import PartyModel from './PartyModel'
export type PartyListProps = {
    id: number
    name: string
    date: string
    location: string
    description: string
    attendees: number
    imageUrl: string
  }
  
export default function PartyList({ parties }: {parties : PartyListProps[]}) {
    const [selectedParty, setSelectedParty] = useState<PartyListProps | null>(null)
    return(
        <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {parties.map((party) => (
          <PartyCard key={party.id} party={party} onClick={() => setSelectedParty(party)} />
        ))}
      </div>
      {selectedParty && <PartyModel party={selectedParty} onClose={() => setSelectedParty(null)} />}
    </div>
    )
}