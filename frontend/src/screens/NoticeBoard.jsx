import React, { useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Calendar } from 'lucide-react';

const NoticeBoard = () => {
  const { notices, fetchNotices } = useFinancial();
  const { t } = useAuth();

  useEffect(() => {
    fetchNotices();
  }, []);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="container-fluid p-0 safe-wrapper animate-fade-in" style={{ paddingBottom: '100px', maxWidth: '650px' }}>
      <div className="mb-4 pb-1">
        <h2 className="fw-extrabold text-brown m-0 d-flex align-items-center gap-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
          <Megaphone className="text-brown" size={26} />
          <span>{t.noticeBoard || 'Notice Board'}</span>
        </h2>
        <p className="text-muted small m-0">{t.recentAnnouncements || 'Group announcements & meeting updates'}</p>
      </div>

      <div className="card-glass p-4 shadow-sm border border-light">
        {notices.length === 0 ? (
          <div className="text-center text-muted py-5 my-auto">
            <Megaphone size={40} className="mb-2 opacity-50 text-brown" />
            <div className="fw-semibold">{t.noAnnouncements || 'No announcements posted yet.'}</div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {notices.map((n) => (
              <div key={n.id} className="p-3.5 rounded-3 bg-white border border-light shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h6 className="fw-bold text-brown m-0" style={{ fontSize: '14px', fontFamily: "'Outfit', sans-serif" }}>
                    {n.title}
                  </h6>
                  <span className="text-muted small" style={{ fontSize: '10px' }}>
                    {formatDate(n.created_at)}
                  </span>
                </div>
                <p className="text-muted small m-0 mb-2" style={{ fontSize: '12.5px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {n.message}
                </p>
                {n.meeting_datetime && (
                  <div className="p-2 rounded-3 bg-warm-cream text-brown font-weight-bold d-flex align-items-center gap-2 border border-light" style={{ fontSize: '11px' }}>
                    <Calendar size={14} className="text-warning flex-shrink-0" />
                    <span>{t.meetingSchedule || 'Meeting Schedule'}: {new Date(n.meeting_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticeBoard;
