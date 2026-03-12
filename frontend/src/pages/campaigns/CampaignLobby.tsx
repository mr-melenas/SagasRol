import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { 
  Info, 
  Users, 
  ScrollText, 
  BookOpen, 
  Shield, 
  Swords, 
  Calendar, 
  Copy, 
  PlusCircle, 
  User as UserIcon,
  Edit2,
  Check,
  X,
  Camera
} from 'lucide-react';
import { LobbyData, AttendanceStatus } from '../../types';
import { CharacterAvatar } from '../../components/player/CharacterAvatar';
import { NotesTab } from './tabs/NotesTab';
import { LibraryTab } from './tabs/LibraryTab';

type TabType = 'general' | 'party' | 'notes' | 'library';

export function CampaignLobby() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  
  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [processingAttendance, setProcessingAttendance] = useState<string | null>(null);

  // Editing States
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescValue, setEditDescValue] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const fetchLobby = async (silent = false) => {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await axios.get(`http://localhost:8000/campaigns/${id}/lobby`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (isMounted) {
            setLobbyData(response.data);
            if (!silent) {
                setEditDescValue(response.data.campaign.description || '');
                setLoading(false);
            }
        }
      } catch (err: any) {
        console.error("Error fetching lobby:", err);
        if (isMounted && !silent) {
            setError(err.response?.data?.detail || "No se pudo cargar el lobby de la campaña.");
            setLoading(false);
        }
      }
    };

    if (id) {
      // Initial fetch
      fetchLobby();

      // Polling every 10 seconds
      intervalId = setInterval(() => {
        fetchLobby(true);
      }, 10000);
    }

    return () => {
        isMounted = false;
        if (intervalId) clearInterval(intervalId);
    };
  }, [id, getToken]);

  const handleSaveDescription = async () => {
    if (!lobbyData) return;
    setSavingDesc(true);
    try {
      const token = await getToken();
      await axios.patch(`http://localhost:8000/campaigns/${id}`, {
        description: editDescValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setLobbyData({
        ...lobbyData,
        campaign: {
          ...lobbyData.campaign,
          description: editDescValue
        }
      });
      setIsEditingDesc(false);
    } catch (err) {
      console.error("Failed to save description", err);
      alert("Error al guardar la descripción.");
    } finally {
      setSavingDesc(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lobbyData) return;

    if (!file.type.startsWith('image/')) {
        alert("Por favor selecciona un archivo de imagen válido.");
        return;
    }

    setUploadingBanner(true);
    try {
        const token = await getToken();
        const formData = new FormData();
        formData.append('file', file);

        const res = await axios.post(`http://localhost:8000/campaigns/${id}/banner`, formData, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        // Update local state with new banner URL
        setLobbyData({
            ...lobbyData,
            campaign: {
                ...lobbyData.campaign,
                banner_url: res.data.banner_url
            }
        });
    } catch (err) {
        console.error("Banner upload failed", err);
        alert("Error al subir el banner.");
    } finally {
        setUploadingBanner(false);
    }
  };

  const handleAttendanceRequest = async (userId: string, isAttending: boolean) => {
      setProcessingAttendance(userId);
      try {
          const token = await getToken();
          const res = await axios.patch(`http://localhost:8000/campaigns/${id}/members/${userId}/attendance`, {
              is_attending: isAttending
          }, {
              headers: { Authorization: `Bearer ${token}` }
          });
          
          // Update local state
          setLobbyData(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  party: prev.party.map(m => 
                      m.user_id === userId 
                          ? { ...m, attendance_status: res.data.status }
                          : m
                  )
              };
          });
      } catch (err: any) {
          console.error("Failed to update attendance", err);
          alert(err.response?.data?.detail || "Error al actualizar la asistencia.");
      } finally {
          setProcessingAttendance(null);
      }
  };

  const handleAttendanceResolution = async (userId: string, status: AttendanceStatus) => {
      setProcessingAttendance(userId);
      try {
          const token = await getToken();
          const res = await axios.post(`http://localhost:8000/campaigns/${id}/members/${userId}/attendance/resolve`, {
              status: status
          }, {
              headers: { Authorization: `Bearer ${token}` }
          });

          // Update local state
          setLobbyData(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  party: prev.party.map(m => 
                      m.user_id === userId 
                          ? { ...m, attendance_status: res.data.status }
                          : m
                  )
              };
          });
      } catch (err: any) {
          console.error("Failed to resolve attendance", err);
          alert(err.response?.data?.detail || "Error al resolver la asistencia.");
      } finally {
          setProcessingAttendance(null);
      }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-700 rounded-full mb-4"></div>
          <p>Invocando el lobby...</p>
        </div>
      </div>
    );
  }

  if (error || !lobbyData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center p-8 bg-gray-800 rounded-lg border border-red-800">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Fallo Crítico</h2>
          <p className="text-gray-300">{error || "Campaña no encontrada"}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { campaign, is_gm, party } = lobbyData;
  const currentUserMember = party.find(m => m.user_id === user?.id);
  const hasCharacter = !!currentUserMember?.character;

  const copyInviteCode = () => {
    if (campaign.invite_code) {
      navigator.clipboard.writeText(campaign.invite_code);
      // Optional: Add toast notification here
    }
  };

  const handleAttendanceToggle = async (userId: string, currentStatus: boolean) => {
    // Optimistic Update (Only if we are not blocked/polling immediately)
    // Actually, let's skip optimistic update for attendance to avoid flicker if polling hits first
    // Or better, handle the state update after success to ensure consistency
    // But user asked for Optimistic UI + robust polling.
    // The flicker happens if: Optimistic -> Polling (Old Data) -> API Success -> Polling (New Data).
    // Solution: We should ignore polling updates for this specific user while we are "saving".
    
    // For now, let's keep it simple: 
    // 1. Optimistic Update
    // 2. Call API
    // 3. On Error: Revert
    // 4. Polling will eventually confirm it. 
    // To prevent flicker, the backend fix (commit) is the most important. 
    // If backend is fast and correct, the "Old Data" polling window is tiny.
    
    setLobbyData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            party: prev.party.map(m => 
                m.user_id === userId 
                    ? { ...m, attending_next_session: !currentStatus }
                    : m
            )
        };
    });

    try {
        const token = await getToken();
        await axios.patch(`http://localhost:8000/campaigns/${id}/members/${userId}/attendance`, {
            is_attending: !currentStatus
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        // Success: Do nothing, state is already updated optimistically
    } catch (err) {
        console.error("Failed to update attendance", err);
        // Revert on failure
        setLobbyData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                party: prev.party.map(m => 
                    m.user_id === userId 
                        ? { ...m, attending_next_session: currentStatus }
                        : m
                )
            };
        });
        alert("Error al actualizar la asistencia.");
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Description Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg relative group">
              <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
                    <Info size={20} /> Sobre la Campaña
                  </h3>
                  
                  {is_gm && !isEditingDesc && (
                      <button 
                        onClick={() => setIsEditingDesc(true)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Editar descripción"
                      >
                          <Edit2 size={16} />
                      </button>
                  )}
              </div>
              
              {isEditingDesc ? (
                  <div className="space-y-3">
                      <textarea
                          value={editDescValue}
                          onChange={(e) => setEditDescValue(e.target.value)}
                          className="w-full h-40 bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                          placeholder="Escribe la descripción de tu campaña..."
                      />
                      <div className="flex justify-end gap-2">
                          <button 
                              onClick={() => {
                                  setIsEditingDesc(false);
                                  setEditDescValue(campaign.description || '');
                              }}
                              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-md flex items-center gap-1"
                              disabled={savingDesc}
                          >
                              <X size={14} /> Cancelar
                          </button>
                          <button 
                              onClick={handleSaveDescription}
                              className="px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-500 rounded-md flex items-center gap-1 shadow-md"
                              disabled={savingDesc}
                          >
                              {savingDesc ? (
                                  <span className="animate-pulse">Guardando...</span>
                              ) : (
                                  <>
                                    <Check size={14} /> Guardar
                                  </>
                              )}
                          </button>
                      </div>
                  </div>
              ) : (
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {campaign.description || "No hay descripción disponible para esta aventura."}
                  </p>
              )}
            </div>

            {/* GM Only: Invite Code */}
            {is_gm && campaign.invite_code && (
              <div className="bg-gray-800 rounded-xl p-6 border border-indigo-900/50 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield size={100} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Invitar Aventureros</h3>
                <p className="text-gray-400 text-sm mb-4">Comparte este código con tus jugadores para que se unan al lobby.</p>
                
                <div className="flex items-center gap-2 bg-black/30 p-3 rounded-lg border border-gray-700 max-w-md">
                  <code className="flex-1 font-mono text-xl text-yellow-400 tracking-wider text-center">
                    {campaign.invite_code}
                  </code>
                  <button 
                    onClick={copyInviteCode}
                    className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                    title="Copiar Código"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'party':
        const attendees = party.filter(m => m.attendance_status === AttendanceStatus.CONFIRMED);
        const pending = party.filter(m => m.attendance_status === AttendanceStatus.PENDING);
        
        // Sort party to put current user first
        const sortedParty = [...party].sort((a, b) => {
            if (a.user_id === user?.id) return -1;
            if (b.user_id === user?.id) return 1;
            return 0;
        });

        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* CTA for Players without Character */}
            {!is_gm && !hasCharacter && (
              <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-8 border border-indigo-500 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-white mb-2">¡Falta tu Héroe!</h2>
                  <p className="text-indigo-200 mb-6 max-w-lg mx-auto">
                    Te has unido al lobby, pero aún no has asignado un personaje a esta campaña. 
                    Crea uno ahora para prepararte para la aventura.
                  </p>
                  <button 
                    onClick={() => navigate(`/characters/create?campaign_id=${campaign.id}`)}
                    className="bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2 mx-auto"
                  >
                    <PlusCircle size={20} /> Crear Personaje
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 0: PENDING REQUESTS (GM ONLY) */}
            {is_gm && pending.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                        <Info size={20} /> Solicitudes Pendientes ({pending.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pending.map(member => (
                            <div key={member.user_id} className="bg-gray-800 p-4 rounded-lg border border-yellow-700/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                                         <CharacterAvatar 
                                            characterId={member.character?.id}
                                            initialImageUrl={member.character?.image_url}
                                            name={member.username}
                                            className="w-full h-full"
                                        />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-200">{member.character?.name || member.username}</p>
                                        <p className="text-xs text-yellow-500">Solicita unirse</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleAttendanceResolution(member.user_id, AttendanceStatus.CONFIRMED)}
                                        className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                                        title="Aceptar"
                                        disabled={processingAttendance === member.user_id}
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleAttendanceResolution(member.user_id, AttendanceStatus.REJECTED)}
                                        className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                                        title="Rechazar"
                                        disabled={processingAttendance === member.user_id}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION 1: ATTENDEES */}
            <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                    <Check size={20} /> Asistentes Confirmados
                </h3>
                {attendees.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                        {attendees.map(member => (
                            <div key={member.user_id} className="flex flex-col items-center group">
                                <div className="w-14 h-14 rounded-full border-2 border-green-500/50 overflow-hidden shadow-lg shadow-green-900/20 group-hover:scale-105 transition-transform bg-gray-800">
                                    <CharacterAvatar 
                                        characterId={member.character?.id}
                                        initialImageUrl={member.character?.image_url}
                                        name={member.username}
                                        className="w-full h-full"
                                    />
                                </div>
                                <span className="text-xs font-medium text-gray-300 mt-2 text-center max-w-[80px] truncate">
                                    {member.character?.name || member.username}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 italic text-sm">Aún no hay confirmaciones para la próxima sesión.</p>
                )}
            </div>

            <hr className="border-gray-800" />

            {/* SECTION 2: ALL MEMBERS */}
            <div>
                <h3 className="text-lg font-bold text-gray-400 mb-4 flex items-center gap-2">
                    <Users size={20} /> Todos los Miembros
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedParty.map((member) => {
                    const isMe = user?.id === member.user_id;
                    return (
                    <div 
                    key={member.user_id} 
                    className={`bg-gray-800 rounded-xl overflow-hidden border transition-all hover:shadow-xl ${
                        isMe ? 'border-indigo-500 ring-1 ring-indigo-500' : 
                        member.role === 'GM' ? 'border-yellow-600/50' : 'border-gray-700 hover:border-gray-500'
                    }`}
                    >
                    {/* Member Header */}
                    <div className={`p-4 flex justify-between items-center ${
                        isMe ? 'bg-indigo-900/30' :
                        member.role === 'GM' ? 'bg-yellow-900/20' : 'bg-gray-900/50'
                    }`}>
                        <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            member.role === 'GM' ? 'bg-yellow-600 text-black' : 'bg-gray-600 text-white'
                        }`}>
                            {member.role === 'GM' ? 'GM' : 'PJ'}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-200">
                                {member.username} {isMe && <span className="text-indigo-400 text-xs ml-1">(Tú)</span>}
                            </p>
                            <p className="text-xs text-gray-500">Unido el {new Date(member.joined_at).toLocaleDateString()}</p>
                        </div>
                        </div>
                    </div>

                    {/* Character Info */}
                    <div className="p-4 space-y-4">
                        {member.character ? (
                        <div className="flex gap-4">
                            <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 border border-gray-600">
                                <CharacterAvatar 
                                    characterId={member.character?.id}
                                    initialImageUrl={member.character?.image_url}
                                    name={member.character.name}
                                    className="w-full h-full"
                                />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg">{member.character.name}</h4>
                                <button 
                                    onClick={() => navigate(`/character/${member.character!.id}`)}
                                    className="text-indigo-400 text-xs hover:text-indigo-300 mt-1 hover:underline"
                                >
                                    Ver Hoja
                                </button>
                            </div>
                        </div>
                        ) : (
                        <div className="h-16 flex items-center justify-center text-gray-500 italic text-sm bg-gray-900/30 rounded-lg border border-dashed border-gray-700">
                            {member.role === 'GM' ? 'Game Master' : 'Sin Personaje'}
                        </div>
                        )}

                        {/* Attendance Toggle / Status */}
                        <div className="pt-3 border-t border-gray-700 flex justify-between items-center">
                            <span className="text-sm text-gray-400">Asistencia:</span>
                            
                            {/* Render different controls based on status and user role */}
                            {(() => {
                                const status = member.attendance_status;
                                const isProcessed = status === AttendanceStatus.CONFIRMED || status === AttendanceStatus.REJECTED;
                                
                                // Only show controls for ME or if I am GM (GM can manage anyone if needed, but requirements say if not yours, hide option)
                                // Actually, if it's NOT me, and I am NOT GM, I should see nothing or just status.
                                // If I am GM, I see pending requests above, here maybe just status.
                                
                                if (!isMe && !is_gm) {
                                     // Another player viewing someone else: Just show status if confirmed
                                     if (status === AttendanceStatus.CONFIRMED) return <span className="text-green-500 text-sm font-bold">Asistirá</span>;
                                     if (status === AttendanceStatus.DECLINED) return <span className="text-gray-500 text-sm">No Asiste</span>;
                                     return <span className="text-gray-600 text-sm italic">...</span>;
                                }

                                if (!isMe && is_gm) {
                                     // GM viewing someone else
                                     if (status === AttendanceStatus.PENDING) return <span className="text-yellow-500 text-sm font-bold">Pendiente</span>;
                                     if (status === AttendanceStatus.CONFIRMED) return <span className="text-green-500 text-sm font-bold">Confirmado</span>;
                                     if (status === AttendanceStatus.REJECTED) return <span className="text-red-500 text-sm font-bold">Rechazado</span>;
                                     if (status === AttendanceStatus.DECLINED) return <span className="text-gray-500 text-sm">No Asiste</span>;
                                     return <span className="text-gray-500 text-sm">Sin respuesta</span>;
                                }

                                // Player View (Me)
                                // If processed and not GM, show status text only
                                if (isProcessed && !is_gm) {
                                    if (status === AttendanceStatus.CONFIRMED) return <span className="text-green-500 text-sm font-bold">Confirmado (Asistes)</span>;
                                    if (status === AttendanceStatus.REJECTED) return <span className="text-red-500 text-sm font-bold">Rechazado por GM</span>;
                                }

                                // Interactive Toggle for Me
                                const isCheck = status === AttendanceStatus.CONFIRMED || status === AttendanceStatus.PENDING;
                                
                                return (
                                    <div className="flex items-center gap-2">
                                        {status === AttendanceStatus.PENDING && (
                                            <span className="text-xs text-yellow-500 italic">Enviado</span>
                                        )}
                                        <button
                                            onClick={() => handleAttendanceRequest(member.user_id, !isCheck)}
                                            disabled={processingAttendance === member.user_id || (isProcessed && !is_gm)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                                isCheck ? (status === AttendanceStatus.PENDING ? 'bg-yellow-600' : 'bg-green-600') : 'bg-gray-600'
                                            } ${(processingAttendance === member.user_id || (isProcessed && !is_gm)) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    isCheck ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                    </div>
                );
                })}
                </div>
            </div>
          </div>
        );

      case 'notes':
        return (
          <NotesTab 
            notes={lobbyData.notes} 
            campaignId={campaign.id} 
            is_gm={is_gm} 
            hasCharacter={hasCharacter}
            onUpdate={() => {
                // Trigger a silent refresh
                const fetchLobby = async () => {
                    try {
                        const token = await getToken();
                        const response = await axios.get(`http://localhost:8000/campaigns/${id}/lobby`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setLobbyData(response.data);
                    } catch (e) { console.error(e); }
                };
                fetchLobby();
            }}
          />
        );

      case 'library':
        return (
          <LibraryTab 
            handouts={lobbyData.handouts} 
            campaignId={campaign.id} 
            is_gm={is_gm}
            onUpdate={() => {
                // Trigger a silent refresh
                const fetchLobby = async () => {
                    try {
                        const token = await getToken();
                        const response = await axios.get(`http://localhost:8000/campaigns/${id}/lobby`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setLobbyData(response.data);
                    } catch (e) { console.error(e); }
                };
                fetchLobby();
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header Image / Gradient */}
      <div className="h-48 md:h-64 relative group">
        {/* Banner Image */}
        <div className="absolute inset-0 bg-gray-900 overflow-hidden">
            {campaign.banner_url ? (
                <img 
                    src={campaign.banner_url} 
                    alt="Campaign Banner" 
                    className="w-full h-full object-cover opacity-60"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-b from-indigo-900 to-gray-900 opacity-80" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
        </div>

        {/* Edit Banner Button (GM Only) */}
        {is_gm && (
            <label className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer transition-all opacity-0 group-hover:opacity-100 border border-white/20">
                {uploadingBanner ? (
                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                    <Camera size={20} />
                )}
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                />
            </label>
        )}

        <div className="container mx-auto px-6 h-full flex flex-col justify-end pb-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                  is_gm ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                }`}>
                  {is_gm ? 'Game Master' : 'Jugador'}
                </span>
                {campaign.next_session_at && (
                  <span className="flex items-center gap-1 text-gray-400 text-xs bg-black/50 px-2 py-1 rounded border border-gray-700">
                    <Calendar size={12} />
                    Próxima Sesión: {new Date(campaign.next_session_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg shadow-black">{campaign.name}</h1>
            </div>
            
            <button 
               onClick={() => navigate(`/game/${campaign.id}`)}
               className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
            >
               <Swords size={20} /> Entrar a la Partida
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        
        {/* Tabs Navigation */}
        <div className="flex gap-2 border-b border-gray-700 mb-8 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'general', label: 'Resumen', icon: Info },
            { id: 'party', label: 'Grupo', icon: Users },
            { id: 'notes', label: 'Diario', icon: ScrollText },
            { id: 'library', label: 'Biblioteca', icon: BookOpen },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-500' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="min-h-[400px]">
            {renderTabContent()}
        </div>

      </div>
    </div>
  );
}
