import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CalendarEvent } from '../types';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

interface OutletContextType {
  subAccountId: string;
}

interface BigCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: CalendarEvent;
}

interface NewEventModal {
  isOpen: boolean;
  selectedDate?: Date;
}

export const CalendarPage: React.FC = () => {
  const { subAccountId } = useOutletContext<OutletContextType>();
  const [events, setEvents] = useState<BigCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [newEventModal, setNewEventModal] = useState<NewEventModal>({ isOpen: false });
  const [formData, setFormData] = useState({
    title: '',
    type: 'appointment' as 'appointment' | 'call' | 'task',
    startDateTime: '',
    endDateTime: '',
    notes: '',
  });
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    loadEvents();
  }, [subAccountId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('sub_account_id', subAccountId);

      if (error) throw error;

      const formattedEvents: BigCalendarEvent[] = (data || []).map((event: CalendarEvent) => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        resource: event,
      }));

      setEvents(formattedEvents);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayEventsList = (data || [])
        .filter((event: CalendarEvent) => {
          const eventDate = new Date(event.start_time);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        })
        .sort((a: CalendarEvent, b: CalendarEvent) => {
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        });

      setTodayEvents(todayEventsList);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setNewEventModal({ isOpen: true, selectedDate: slotInfo.start });
    setFormData({
      title: '',
      type: 'appointment',
      startDateTime: slotInfo.start.toISOString().slice(0, 16),
      endDateTime: slotInfo.end.toISOString().slice(0, 16),
      notes: '',
    });
  };

  const handleSelectEvent = (event: BigCalendarEvent) => {
    setSelectedEvent(event.resource || null);
    setShowEventDetail(true);
  };

  const handleSaveEvent = async () => {
    if (!formData.title.trim()) {
      alert('Please enter an event title');
      return;
    }

    try {
      const { error } = await supabase.from('calendar_events').insert({
        sub_account_id: subAccountId,
        title: formData.title,
        type: formData.type,
        start_time: new Date(formData.startDateTime).toISOString(),
        end_time: new Date(formData.endDateTime).toISOString(),
        notes: formData.notes,
      });

      if (error) throw error;

      setNewEventModal({ isOpen: false });
      setFormData({
        title: '',
        type: 'appointment',
        startDateTime: '',
        endDateTime: '',
        notes: '',
      });
      await loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading calendar...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: '20px', padding: '20px', backgroundColor: '#f5f5f5' }}>
      <div style={{ flex: 1 }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e5e5', padding: '20px', height: '100%' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            popup
            view="month"
            defaultView="month"
          />
        </div>
      </div>

      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e5e5', padding: '16px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
            Today's Events
          </h3>
          {todayEvents.length === 0 ? (
            <p style={{ margin: '0', fontSize: '13px', color: '#999' }}>
              No events scheduled for today
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {todayEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    borderLeft: '3px solid #7c3aed',
                  }}
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowEventDetail(true);
                  }}
                >
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '500', color: '#1a1a1a' }}>
                    {event.title}
                  </p>
                  <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>
                    {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {newEventModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e5e5',
            width: '90%',
            maxWidth: '400px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
                New Event
              </h2>
              <button
                onClick={() => setNewEventModal({ isOpen: false })}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#666',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px', color: '#1a1a1a' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px', color: '#1a1a1a' }}>
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="appointment">Appointment</option>
                  <option value="call">Call</option>
                  <option value="task">Task</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px', color: '#1a1a1a' }}>
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDateTime}
                  onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px', color: '#1a1a1a' }}>
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDateTime}
                  onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px', color: '#1a1a1a' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setNewEventModal({ isOpen: false })}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    backgroundColor: '#f5f5f5',
                    color: '#1a1a1a',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Save Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEventDetail && selectedEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e5e5',
            width: '90%',
            maxWidth: '400px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
                Event Details
              </h2>
              <button
                onClick={() => setShowEventDetail(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#666',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '500', color: '#666' }}>
                  Title
                </p>
                <p style={{ margin: '0', fontSize: '14px', color: '#1a1a1a' }}>
                  {selectedEvent.title}
                </p>
              </div>

              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '500', color: '#666' }}>
                  Type
                </p>
                <p style={{ margin: '0', fontSize: '14px', color: '#1a1a1a', textTransform: 'capitalize' }}>
                  {selectedEvent.type}
                </p>
              </div>

              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '500', color: '#666' }}>
                  Start
                </p>
                <p style={{ margin: '0', fontSize: '14px', color: '#1a1a1a' }}>
                  {format(new Date(selectedEvent.start_time), 'PPp')}
                </p>
              </div>

              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '500', color: '#666' }}>
                  End
                </p>
                <p style={{ margin: '0', fontSize: '14px', color: '#1a1a1a' }}>
                  {format(new Date(selectedEvent.end_time), 'PPp')}
                </p>
              </div>

              {selectedEvent.description && (
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '500', color: '#666' }}>
                    Notes
                  </p>
                  <p style={{ margin: '0', fontSize: '14px', color: '#1a1a1a' }}>
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowEventDetail(false)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginTop: '12px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
