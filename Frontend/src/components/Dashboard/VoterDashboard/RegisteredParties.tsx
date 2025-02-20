import PartyList, { PartyListProps } from "../ui/PartyList"
import axios from 'axios'
export default function RegisteredParties () {
  const parties: PartyListProps[] = [
    {
      id: 1,
      name: "Neon Nights",
      date: "2025-08-15",
      location: "Cyberpunk City Center",
      description: "Experience the future of partying with holographic DJs and AI-powered drinks.",
      attendees: 500,
      imageUrl: "/placeholder.svg?height=300&width=400",
    },
    {
      id: 2,
      name: "Quantum Rave",
      date: "2025-09-22",
      location: "Virtual Reality Dome",
      description: "Dance across multiple dimensions in this mind-bending quantum physics themed party.",
      attendees: 1000,
      imageUrl: "/placeholder.svg?height=300&width=400",
    },
    {
      id: 3,
      name: "Galactic Gala",
      date: "2025-12-31",
      location: "Orbital Space Station",
      description: "Ring in the new year among the stars with zero-gravity dancing and cosmic cocktails.",
      attendees: 250,
      imageUrl: "/placeholder.svg?height=300&width=400",
    }
  ];
    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white">
        Registered Parties
      </h1>
      <PartyList parties={parties} />
    </main>
    )
}