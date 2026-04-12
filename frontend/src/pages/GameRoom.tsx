import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';
import { useAuth, useUser } from '@clerk/clerk-react';

interface LogMessage {
  user?: string;
  message?: string;
  roll?: number;
  formula?: string;
  type: 'chat' | 'roll' | 'system';
}

export const GameRoom: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [diceInput, setDiceInput] = useState('1d20');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initSocket = async () => {
        const token = await getToken();
        if (token) {
            const socket = connectSocket(token);

            socket.emit('join_room', { room: campaignId });

            socket.on('message', (data: any) => {
                setLogs(prev => [...prev, { type: 'system', message: data.data }]);
            });

            socket.on('dice_result', (data: any) => {
                setLogs(prev => [...prev, { 
                type: 'roll', 
                user: data.user, 
                roll: data.roll, 
                formula: data.formula 
                }]);
            });

            socket.on('error', (data: any) => {
                alert(data.message);
            });
        }
    };
    initSocket();

    return () => {
      // Clean up listeners if needed, but disconnect handles socket closure
      // socket.off('message');
      // socket.off('dice_result');
      disconnectSocket();
    };
  }, [campaignId, getToken]);

  const handleRoll = () => {
    const socket = getSocket();
    if (socket) {
        socket.emit('roll_dice', { room: campaignId, dice: diceInput });
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-[800px] p-4 bg-gray-100">
      <div className="flex-1 overflow-y-auto bg-white p-4 rounded shadow mb-4">
        {logs.map((log, i) => (
          <div key={i} className="mb-2 border-b pb-1 last:border-0">
            {log.type === 'system' && (
              <span className="text-gray-500 italic">{log.message}</span>
            )}
            {log.type === 'roll' && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-600">{log.user}</span>
                <span>rolled {log.formula}:</span>
                <span className="font-bold text-xl">{log.roll}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      <div className="flex gap-2 p-4 bg-white rounded shadow">
        <input 
          type="text" 
          value={diceInput}
          onChange={(e) => setDiceInput(e.target.value)}
          className="border p-2 rounded flex-1"
          placeholder="e.g. 1d20, 2d6"
        />
        <button 
          onClick={handleRoll}
          className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 font-bold"
        >
          ROLL
        </button>
      </div>
    </div>
  );
};
