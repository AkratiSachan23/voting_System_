
import {useWebSocket} from '../../../utils/util'
import { BadgeCheck  } from 'lucide-react';
export default function Broadcasting () {
    const messages  = useWebSocket()
    return (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Current Voting</h2>
          <div className="space-y-4 h-[30vw] overflow-y-scroll">
            {messages.map((message, i) => (
              <div key={i} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <BadgeCheck  className="w-4 h-4 text-green-500" />
                </div>
                <div>
                    <div className='flex items-center justify-between w-full'>
                        <span className="text-gray-800 font-medium">{message.name} </span>
                        <span className="text-gray-800 font-medium">{message.party}</span>
                    </div>
                  <p className="text-sm text-gray-500">{message.hash}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
    )
}