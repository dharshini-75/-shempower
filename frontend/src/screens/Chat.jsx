import React, { useEffect, useState, useRef } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { Send, Megaphone, HelpCircle, Calendar, Mic, Square, Play, Pause, Trash2, Volume2 } from 'lucide-react';

const VoiceMessagePlayer = ({ audioUrl }) => {
  const { t } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error('Audio play error:', e));
      setIsPlaying(true);
    }
  };

  const formatSecs = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="d-flex align-items-center gap-2.5 p-2 bg-light rounded-3 border border-secondary border-opacity-25" style={{ minWidth: '180px' }}>
      <button 
        type="button" 
        onClick={togglePlay}
        className="btn btn-brown p-2 rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
        style={{ width: '34px', height: '34px' }}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} className="ms-0.5" />}
      </button>
      <div className="flex-grow-1">
        <div className="d-flex align-items-center justify-content-between mb-1" style={{ fontSize: '10px', color: '#111111' }}>
          <span className="fw-bold d-flex align-items-center gap-1">
            <Volume2 size={12} className="text-brown" />
            {t.voiceMessage || 'Voice Message'}
          </span>
          <span>{formatSecs(currentTime)} / {formatSecs(duration || 5)}</span>
        </div>
        <div className="progress" style={{ height: '4px', backgroundColor: '#E0E0E0' }}>
          <div 
            className="progress-bar bg-brown" 
            role="progressbar" 
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const Chat = () => {
  const { chatMessages, sendChat, deleteChat, fetchChat, notices, fetchNotices } = useFinancial();
  const { user, t } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  
  // Delete message states
  const [deletingMsgId, setDeletingMsgId] = useState(null);
  const [deleteAlert, setDeleteAlert] = useState('');

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  
  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetchChat();
    fetchNotices();
    
    const interval = setInterval(fetchChat, 4000);
    return () => clearInterval(interval);
  }, []);

  const confirmDelete = (msgId) => {
    setDeletingMsgId(msgId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMsgId) return;
    const msgId = deletingMsgId;
    setDeletingMsgId(null);
    const res = await deleteChat(msgId);
    if (res && res.success) {
      setDeleteAlert(t.msgDeleted || 'Message deleted.');
      setTimeout(() => setDeleteAlert(''), 3000);
      fetchChat();
    } else {
      setDeleteAlert(t.msgDeleteFailed || 'Unable to delete message.');
      setTimeout(() => setDeleteAlert(''), 3000);
    }
  };

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';
        else mimeType = '';
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioUrl(reader.result);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert(t.micPermissionError || 'Microphone access is required to record voice messages.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!text.trim() && !audioUrl) return;

    setSending(true);
    let res;
    if (audioUrl) {
      const vLabel = t.voiceMessage || 'Voice Message';
      res = await sendChat(text.trim() || `🎤 ${vLabel} (${recordingTime}s)`, audioUrl);
    } else {
      res = await sendChat(text);
    }
    setSending(false);

    if (res && res.success) {
      setText('');
      setAudioUrl(null);
      setRecordingTime(0);
      fetchChat();
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getNoticeBanner = () => {
    if (notices.length === 0) return null;
    const latest = notices[0];
    return (
      <div className="alert alert-warning mb-3 p-3 border-0 d-flex gap-3 align-items-start shadow-sm" style={{ backgroundColor: 'var(--primary-brown-light)', color: '#111111', borderRadius: '14px' }}>
        <Megaphone size={20} className="text-brown flex-shrink-0 mt-0.5" style={{ color: 'var(--primary-brown)' }} />
        <div>
          <strong className="d-block mb-1 text-dark" style={{ fontSize: '13px', fontFamily: "'Outfit', sans-serif" }}>{t.pinnedNotice || 'Pinned Notice'}: {latest.title}</strong>
          <p className="small m-0 text-dark opacity-90" style={{ fontSize: '11.5px', lineHeight: '1.4' }}>{latest.message}</p>
          {latest.meeting_datetime && (
            <div className="mt-2 fw-bold text-brown d-flex align-items-center gap-1.5" style={{ fontSize: '10.5px' }}>
              <Calendar size={12} className="text-warning" />
              <span>{t.meeting || 'Meeting'}: {new Date(latest.meeting_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid p-0 d-flex flex-column h-100 animate-fade-in" style={{ height: 'calc(100vh - 140px) !important' }}>
      
      {/* Page Header */}
      <div className="mb-3">
        <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>{t.groupChat}</h2>
        <p className="text-muted small m-0">
          {t.groupChatSubtitle || 'Group-wide chat thread with peer members and Group Leader'} ({user?.full_name})
        </p>
      </div>

      {/* Pinned announcement banner */}
      {getNoticeBanner()}

      {/* Chat Thread Area */}
      <div className="card-glass flex-grow-1 p-0 d-flex flex-column overflow-hidden shadow-sm" style={{ minHeight: '350px', borderRadius: '24px' }}>
        
        {/* Messages list */}
        <div className="flex-grow-1 overflow-auto p-3 bg-warm-cream" style={{ maxHeight: '420px' }}>
          {chatMessages.length === 0 ? (
            <div className="text-center text-muted py-5 my-auto">
              <HelpCircle size={36} className="mb-2 opacity-50 text-brown" />
              <div className="small fw-semibold">{t.noMessagesYet || 'No messages in thread yet. Start the conversation!'}</div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {chatMessages.map((msg) => {
                const isMe = Number(msg.senderId) === Number(user?.id);
                const isLeader = msg.senderRole === 'leader';
                const hasAudio = msg.audioUrl || (msg.message && msg.message.startsWith('data:audio'));
                
                return (
                  <div 
                    key={msg.id} 
                    className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}
                  >
                    {/* Sender Name metadata — crisp, clear dark font */}
                    <span className="text-dark fw-bold mb-1 px-1" style={{ fontSize: '10.5px', color: '#111111' }}>
                      {msg.senderName} {isLeader && <span className="text-warning">👑 ({t.language === 'ta' ? 'தலைவி' : 'Leader'})</span>} {!isLeader && <span className="text-muted" style={{ fontSize: '9px' }}>({t.language === 'ta' ? 'உறுப்பினர்' : 'Member'})</span>}
                    </span>

                    {/* Chat Bubble — High contrast black text color */}
                    <div 
                      className="p-3 rounded-3 shadow-sm border"
                      style={{
                        maxWidth: '85%',
                        backgroundColor: isMe ? '#FAF3EB' : '#FFFFFF',
                        color: '#111111',
                        borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0',
                        borderColor: isMe ? '#D4B996' : '#E0E0E0'
                      }}
                    >
                      {hasAudio ? (
                        <VoiceMessagePlayer audioUrl={msg.audioUrl || msg.message} />
                      ) : (
                        <p className="m-0 fw-semibold" style={{ fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.4', color: '#111111' }}>
                          {msg.message}
                        </p>
                      )}
                    </div>

                    {/* Timestamp & Delete Action */}
                    <div className="d-flex align-items-center gap-1.5 mt-1 px-1">
                      <span className="text-dark opacity-75 fw-bold" style={{ fontSize: '9px', color: '#333333' }}>
                        {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => confirmDelete(msg.id)}
                          className="btn p-0 border-0 text-danger opacity-75 hover-opacity-100 ms-1 d-inline-flex align-items-center"
                          title={t.deleteMsg || 'Delete'}
                          style={{ fontSize: '10px' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Message Input Box footer */}
        <div className="p-3 bg-white border-top border-light">

          {/* Voice recording live status indicator */}
          {isRecording && (
            <div className="d-flex align-items-center justify-content-between p-2.5 mb-2 bg-danger bg-opacity-10 rounded-3 border border-danger border-opacity-25 animate-pulse">
              <div className="d-flex align-items-center gap-2 text-danger fw-bold" style={{ fontSize: '12px' }}>
                <span className="spinner-grow spinner-grow-sm text-danger" role="status" />
                <span>{t.recording || 'Recording...'} ({formatTimer(recordingTime)})</span>
              </div>
              <div className="d-flex gap-2">
                <button type="button" onClick={stopRecording} className="btn btn-sm btn-danger px-3 font-weight-bold">
                  <Square size={13} className="me-1" /> {t.stopRecording || 'Stop'}
                </button>
                <button type="button" onClick={cancelRecording} className="btn btn-sm btn-outline-secondary px-2">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Voice recording preview before send */}
          {audioUrl && !isRecording && (
            <div className="d-flex align-items-center justify-content-between p-2.5 mb-2 bg-light rounded-3 border border-warm">
              <VoiceMessagePlayer audioUrl={audioUrl} />
              <button type="button" onClick={() => setAudioUrl(null)} className="btn btn-sm btn-outline-danger p-1 ms-2">
                <Trash2 size={14} />
              </button>
            </div>
          )}

          <form onSubmit={handleSendText} className="d-flex gap-2 align-items-center">
            {/* Microphone Button */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="btn btn-outline-brown p-2.5 d-flex align-items-center justify-content-center border-2 flex-shrink-0"
                style={{ borderRadius: '12px', minWidth: '44px', height: '44px' }}
                title={t.recordVoice || 'Record Voice Message'}
              >
                <Mic size={18} />
              </button>
            ) : null}

            <input 
              type="text"
              placeholder={audioUrl ? (t.voiceReady || 'Voice message ready to send (optional note)') : (t.typeMessage || 'Type a message...')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="form-control form-control-warm touch-input py-2"
              disabled={sending || isRecording}
              style={{ height: '44px', color: '#111111' }}
            />

            <button 
              type="submit" 
              disabled={sending || isRecording || (!text.trim() && !audioUrl)}
              className="btn btn-brown px-3 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ borderRadius: '12px', minWidth: '48px', height: '44px' }}
            >
              {sending ? (
                <div className="spinner-border spinner-border-sm" role="status" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deletingMsgId && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1" style={{ zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: '16px' }}>
              <div className="modal-body text-center p-4">
                <Trash2 size={36} className="text-danger mb-2" />
                <h6 className="fw-bold text-dark mb-3">{t.confirmDeleteMsg || 'Delete this message?'}</h6>
                <div className="d-flex gap-2 justify-content-center">
                  <button type="button" onClick={() => setDeletingMsgId(null)} className="btn btn-sm btn-outline-secondary px-3" style={{ borderRadius: '8px' }}>
                    {t.cancel || 'Cancel'}
                  </button>
                  <button type="button" onClick={handleDeleteConfirm} className="btn btn-sm btn-danger px-3" style={{ borderRadius: '8px' }}>
                    {t.deleteMsg || 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete alert toast */}
      {deleteAlert && (
        <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4 z-index-modal">
          <div className="alert alert-dark bg-dark text-white border-0 shadow-lg px-4 py-2.5 rounded-pill small fw-bold">
            {deleteAlert}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
