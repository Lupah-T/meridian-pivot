import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ScanLine, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CheckIn = () => {
  const [attendeeId, setAttendeeId] = useState('');
  const [status, setStatus] = useState('IDLE'); // IDLE, PENDING, CHECKED_IN, ERROR, DUPLICATE_CHECKED_IN, DUPLICATE_PENDING
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef(null);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = (id) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/attendees/${id}/status`);
        if (res.data.status === 'CHECKED_IN') {
          setStatus('CHECKED_IN');
          stopPolling();
        } else if (res.data.status === 'PRINT_FAILED') {
          setStatus('ERROR');
          setErrorMessage('Badge printing failed. Please try again.');
          stopPolling();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!attendeeId.trim()) return;

    setLoading(true);
    setErrorMessage('');
    setStatus('IDLE');
    stopPolling();

    try {
      const res = await axios.post(`${API_URL}/check-in`, { attendeeId: attendeeId.trim() });
      
      if (res.status === 202) {
        setStatus('PENDING');
        startPolling(attendeeId.trim());
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === 409) {
          if (err.response.data.error.includes('already being checked in')) {
            setStatus('DUPLICATE_PENDING');
          } else {
            setStatus('DUPLICATE_CHECKED_IN');
          }
        } else if (err.response.status === 404) {
          setStatus('ERROR');
          setErrorMessage('Attendee not found.');
        } else {
          setStatus('ERROR');
          setErrorMessage(err.response.data.error || 'Check-in failed.');
        }
      } else {
        setStatus('ERROR');
        setErrorMessage('Network error. Please ensure server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAttendeeId('');
    setStatus('IDLE');
    setErrorMessage('');
    stopPolling();
  };

  return (
    <div className="kiosk-container">
      <div className="title">Solstice Events</div>
      <div className="subtitle">Conference Check-In</div>

      <form onSubmit={handleCheckIn}>
        <div className="input-group">
          <label className="input-label">Attendee ID</label>
          <input
            type="text"
            className="attendee-input"
            value={attendeeId}
            onChange={(e) => setAttendeeId(e.target.value)}
            placeholder="e.g. ATT001"
            disabled={loading || status === 'PENDING'}
            autoFocus
          />
        </div>

        <button 
          type="submit" 
          className="btn"
          disabled={!attendeeId.trim() || loading || status === 'PENDING'}
        >
          {loading ? (
            <><Loader2 className="spinner" size={20} /> Processing...</>
          ) : (
            <><ScanLine size={20} /> CHECK IN</>
          )}
        </button>
      </form>

      {/* Status Rendering */}
      {status === 'IDLE' && (
        <div className="status-card">
          <div className="status-title">Status:</div>
          <div className="status-desc">Waiting for scan</div>
        </div>
      )}

      {status === 'PENDING' && (
        <div className="status-card pending">
          <Loader2 className="status-icon spinner" />
          <div className="status-title pulse">Printing badge...</div>
          <div className="status-desc">Please wait.</div>
        </div>
      )}

      {status === 'CHECKED_IN' && (
        <div className="status-card success">
          <CheckCircle2 className="status-icon" style={{ color: 'var(--secondary)' }} />
          <div className="status-title">✓ CHECKED IN</div>
          <div className="status-desc">Badge printed successfully.</div>
          <button className="btn" style={{ marginTop: '1rem', background: 'transparent', border: '1px solid var(--secondary)', color: 'var(--secondary)' }} onClick={handleReset}>
            <RefreshCw size={16} /> Scan Next
          </button>
        </div>
      )}

      {status === 'DUPLICATE_CHECKED_IN' && (
        <div className="status-card error">
          <AlertCircle className="status-icon" style={{ color: 'var(--danger)' }} />
          <div className="status-title">Already Checked In</div>
          <div className="status-desc">This attendee has already received a badge.</div>
        </div>
      )}

      {status === 'DUPLICATE_PENDING' && (
        <div className="status-card pending">
          <AlertCircle className="status-icon" style={{ color: 'var(--warning)' }} />
          <div className="status-title">Badge Already Being Printed</div>
          <div className="status-desc">Please wait for the current print job.</div>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="status-card error">
          <AlertCircle className="status-icon" style={{ color: 'var(--danger)' }} />
          <div className="status-title">Error</div>
          <div className="status-desc">{errorMessage}</div>
        </div>
      )}
    </div>
  );
};

export default CheckIn;
