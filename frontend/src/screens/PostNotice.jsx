import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { Megaphone, ShieldAlert, ShieldCheck } from 'lucide-react';

const PostNotice = () => {
  const navigate = useNavigate();
  const { broadcastNotice } = useFinancial();
  const { t } = useAuth();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [meetingDatetime, setMeetingDatetime] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (title.trim().length < 3) {
      setErrorMsg('Announcement title must be at least 3 characters');
      return;
    }

    if (message.trim().length < 5) {
      setErrorMsg('Announcement details must be at least 5 characters');
      return;
    }

    setLoading(true);
    const res = await broadcastNotice(title, message, meetingDatetime || null);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Notice broadcasted successfully to all group members!');
      setTitle('');
      setMessage('');
      setMeetingDatetime('');
      setTimeout(() => {
        navigate('/leader-dashboard');
      }, 2000);
    } else {
      setErrorMsg(res.message || 'Failed to broadcast announcement');
    }
  };

  return (
    <div className="container-fluid p-0 animate-fade-in" style={{ maxWidth: '500px' }}>
      <div className="mb-4 pb-1">
        <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {t.createNotice}
        </h2>
        <p className="text-muted small m-0">Send a bulletin message or scheduled meeting alert to all group members</p>
      </div>

      <div className="card-glass p-4 shadow-sm border border-light">
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          
          {errorMsg && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 border-0 small" style={{ backgroundColor: 'var(--terracotta-danger-light)', color: 'var(--terracotta-danger)', borderRadius: '10px' }}>
              <ShieldAlert size={16} className="flex-shrink-0" />
              <span className="fw-semibold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 border-0 small text-success" style={{ backgroundColor: 'var(--success-olive-light)', borderRadius: '10px' }}>
              <ShieldCheck size={16} className="flex-shrink-0 text-success" />
              <span className="fw-semibold">{successMsg}</span>
            </div>
          )}

          {/* Title */}
          <div className="d-flex flex-column">
            <label className="form-label-warm">{t.noticeTitleInput || 'Announcement Title'}</label>
            <input 
              type="text"
              placeholder={t.noticeTitlePlaceholder || 'e.g. Monthly SHG Meeting Notice'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-control form-control-warm touch-input"
              required
            />
          </div>

          {/* Message Text */}
          <div className="d-flex flex-column">
            <label className="form-label-warm">{t.noticeText}</label>
            <textarea 
              rows="4"
              placeholder={t.noticeMsgPlaceholder || 'Write the details of the announcement...'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="form-control form-control-warm"
              style={{ borderRadius: '10px' }}
              required
            ></textarea>
          </div>

          {/* Meeting date and time (optional) */}
          <div className="d-flex flex-column">
            <label className="form-label-warm">{t.meetingDatetimeLabel || (t.meetingTime + ' (Optional)')}</label>
            <input 
              type="datetime-local"
              value={meetingDatetime}
              onChange={(e) => setMeetingDatetime(e.target.value)}
              className="form-control form-control-warm touch-input"
            />
          </div>

          {/* Action button */}
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-brown touch-btn shadow w-100 mt-2 d-flex justify-content-center align-items-center gap-2"
          >
            {loading ? (
              <div className="spinner-border spinner-border-sm" role="status"></div>
            ) : (
              <>
                <Megaphone size={18} />
                <span>{t.broadcastBtn}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostNotice;
