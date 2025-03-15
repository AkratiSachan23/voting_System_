import { useEffect, useState } from 'react';
import { Vote, Users, PartyPopper, Trophy } from 'lucide-react';
import axios from 'axios';

interface Party {
    id: number;
    name: string;
    votes: number;
    color: string;
  }

export default function Votenow () {
    const [ids , setIds] = useState<string[]>([]);
    const COLORS = [
        '#4C51BF', '#6B46C1', '#805AD5', '#B794F4', '#553C9A',
        '#2B6CB0', '#3182CE', '#4299E1', '#63B3ED', '#2C5282',
        '#2C7A7B', '#38B2AC', '#4FD1C5', '#81E6D9', '#234E52',
        '#2F855A', '#38A169', '#48BB78', '#9AE6B4', '#22543D',
        '#9C4221', '#C05621', '#DD6B20', '#ED8936', '#7B341E',
        '#742A2A', '#9B2C2C', '#C53030', '#E53E3E', '#742A2A'
      ];
    const [parties, setParties] = useState<Party[]>([]);
      useEffect(() => {
            const getPartiesId = async () => {
                try {
                    const response = await axios.get("http://localhost:3000/api/v2/getPartiesId");
                    if(response.data?.partyIds){
                        setIds(response.data.partyIds);
                    }
                } catch (error) {
                    console.log(error);
                }
            }
            getPartiesId();
      },[]);
      useEffect(() => {
              if (ids.length === 0) return;
      
          const getPartyData = async () => {
            try {
              const requests = ids.map((party) => getFunction(party));
            const results = await Promise.all(requests);
            const validData = results
              .map((res, index) => ({
                id : res.id,
                name: res.name,
                votes: res.voteCount,
                color: COLORS[index % COLORS.length],
              }));
              setParties(validData);
            } catch (error) {
              console.log(error);
            }
          };
          getPartyData();
          },[ids])
      const getFunction = async (partyId: string) => {
        try {
          const response = await axios.get("http://localhost:3000/api/v3/partyStatus", {
            params: { partyId },
          });
          return response.data;
        } catch (error) {
          console.error(`Error fetching party ${partyId}:`, error);
          return null;
        }
      };
      const handleVote = async(id: number) => {
            try {
                const isVerified = await axios.get('http://localhost:3000/api/v1/getVoter',
                    {withCredentials:true}
                );
                if(!isVerified){
                    alert("voter is not login")
                }
                const status = isVerified.data.voter.verified;
                if(!status){
                    alert("voter is not verified")
                    return;
                }
                const castVote = await axios.post('http://localhost:3000/api/v3/vote',{
                    partyId : id
                },{
                    withCredentials : true
                });
                if(!castVote){
                    alert("something went wrong");
                    return;
                }
                if(castVote.status === 200){
                    setParties(parties.map(party => 
                        party.id === id ? { ...party, votes: party.votes + 1 } : party
                    ));
                }
                alert("vote cast successfully");
                window.location.reload();
            } catch (error: any) {
              console.log(error);
                alert(`${error.response.data.message}. ${error.response.data.error.reason}`);
            }
        
      };
    
      const maxVotes = Math.max(...parties.map(party => party.votes));
    
      return (
        <div className="min-h-screen bg-white">
          <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
                <PartyPopper className="h-8 w-8 text-yellow-500" />
                    Vote Now
              </h1>
              <p className="text-gray-600 text-lg">Cast your vote and make your voice heard!</p>
            </div>
    
            <div className="space-y-6">
              {parties.map((party) => (
                <div
                  key={party.id}
                  className="bg-white rounded-lg shadow-lg p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300` } style={{ backgroundColor: party.color }}>
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {party.name}
                          {party.votes === maxVotes && (
                            <Trophy className="h-5 w-5 text-yellow-500 inline ml-2" />
                          )}
                        </h3>
                        <p className="text-gray-600">{party.votes} votes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleVote(party.id)}
                      className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-full
                        transition-all duration-300 hover:bg-indigo-700 focus:outline-none focus:ring-2
                        focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
                    >
                      <Vote className="w-5 h-5" />
                      Vote
                    </button>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={` h-2 rounded-full transition-all duration-500 ease-out`}
                      style={{
                        width: `${(party.votes / maxVotes) * 100}%`,
                        backgroundColor: party.color 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
}