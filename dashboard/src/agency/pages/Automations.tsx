import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, CreditCard as Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Automation } from '../types';

interface OutletContextType {
  subAccountId: string;
}

interface AutomationFormData {
  name: string;
  trigger: string;
  actions: Array<{
    type: string;
    config: Record<string, any>;
  }>;
}

const TRIGGER_OPTIONS = [
  { value: 'new_contact_created', label: 'New Contact Created' },
  { value: 'whatsapp_message_received', label: 'WhatsApp Message Received' },
  { value: 'conversation_status_changed', label: 'Conversation Status Changed' },
  { value: 'opportunity_stage_changed', label: 'Opportunity Stage Changed' },
  { value: 'appointment_scheduled', label: 'Appointment Scheduled' },
  { value: 'tag_added', label: 'Tag Added to Contact' },
  { value: 'form_submitted', label: 'Form Submitted' },
];

const ACTION_OPTIONS = [
  { value: 'send_whatsapp', label: 'Send WhatsApp Message' },
  { value: 'add_tag', label: 'Add Tag to Contact' },
  { value: 'remove_tag', label: 'Remove Tag from Contact' },
  { value: 'move_opportunity', label: 'Move Opportunity to Stage' },
  { value: 'assign_contact', label: 'Assign Contact to Agent' },
  { value: 'wait', label: 'Wait' },
  { value: 'http_webhook', label: 'HTTP Webhook' },
];

export const Automations: React.FC = () => {
  const { subAccountId } = useOutletContext<OutletContextType>();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [formData, setFormData] = useState<AutomationFormData>({
    name: '',
    trigger: '',
    actions: [],
  });

  useEffect(() => {
    loadAutomations();
  }, [subAccountId]);

  const loadAutomations = async () => {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('sub_account_id', subAccountId);

      if (error) throw error;
      setAutomations(data || []);
    } catch (error) {
      console.error('Error loading automations:', error);
    }
  };

  const handleToggleActive = async (automation: Automation) => {
    try {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: !automation.is_active })
        .eq('id', automation.id);

      if (error) throw error;

      // Call edge function to toggle n8n workflow
      await supabase.functions.invoke('toggle-n8n-workflow', {
        body: {
          automationId: automation.id,
          isActive: !automation.is_active,
        },
      });

      await loadAutomations();
    } catch (error) {
      console.error('Error toggling automation:', error);
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;

    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadAutomations();
    } catch (error) {
      console.error('Error deleting automation:', error);
    }
  };

  const handleAddAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { type: '', config: {} }],
    });
  };

  const handleRemoveAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index),
    });
  };

  const handleSaveAutomation = async () => {
    if (!formData.name.trim()) {
      alert('Please enter an automation name');
      return;
    }

    if (!formData.trigger) {
      alert('Please select a trigger');
      return;
    }

    if (formData.actions.length === 0) {
      alert('Please add at least one action');
      return;
    }

    try {
      const { error } = await supabase.from('automations').insert({
        sub_account_id: subAccountId,
        name: formData.name,
        trigger: formData.trigger,
        actions: formData.actions,
        is_active: true,
      });

      if (error) throw error;

      setShowBuilder(false);
      setFormData({ name: '', trigger: '', actions: [] });
      await loadAutomations();
    } catch (error) {
      console.error('Error saving automation:', error);
      alert('Failed to save automation');
    }
  };

  const getTriggerLabel = (type: string) => {
    return TRIGGER_OPTIONS.find((opt) => opt.value === type)?.label || type;
  };

  const renderActionConfig = (action: any, index: number) => {
    const actionType = action.type;

    return (
      <div key={index} style={{ marginTop: '8px' }}>
        {actionType === 'send_whatsapp' && (
          <input
            type="text"
            placeholder="WhatsApp message text"
            defaultValue={action.config.message || ''}
            onChange={(e) => {
              const newActions = [...formData.actions];
              newActions[index].config.message = e.target.value;
              setFormData({ ...formData, actions: newActions });
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        )}
        {actionType === 'add_tag' && (
          <input
            type="text"
            placeholder="Tag name"
            defaultValue={action.config.tagName || ''}
            onChange={(e) => {
              const newActions = [...formData.actions];
              newActions[index].config.tagName = e.target.value;
              setFormData({ ...formData, actions: newActions });
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        )}
        {actionType === 'remove_tag' && (
          <input
            type="text"
            placeholder="Tag name"
            defaultValue={action.config.tagName || ''}
            onChange={(e) => {
              const newActions = [...formData.actions];
              newActions[index].config.tagName = e.target.value;
              setFormData({ ...formData, actions: newActions });
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        )}
        {actionType === 'move_opportunity' && (
          <input
            type="text"
            placeholder="Stage name"
            defaultValue={action.config.stageName || ''}
            onChange={(e) => {
              const newActions = [...formData.actions];
              newActions[index].config.stageName = e.target.value;
              setFormData({ ...formData, actions: newActions });
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        )}
        {actionType === 'assign_contact' && (
          <input
            type="text"
            placeholder="Agent ID"
            defaultValue={action.config.agentId || ''}
            onChange={(e) => {
              const newActions = [...formData.actions];
              newActions[index].config.agentId = e.target.value;
              setFormData({ ...formData, actions: newActions });
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        )}
        {actionType === 'wait' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              placeholder="Duration"
              defaultValue={action.config.duration || ''}
              onChange={(e) => {
                const newActions = [...formData.actions];
                newActions[index].config.duration = parseInt(e.target.value) || 0;
                setFormData({ ...formData, actions: newActions });
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            />
            <select
              defaultValue={action.config.unit || 'hours'}
              onChange={(e) => {
                const newActions = [...formData.actions];
                newActions[index].config.unit = e.target.value;
                setFormData({ ...formData, actions: newActions });
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        )}
        {actionType === 'http_webhook' && (
          <input
            type="url"
            placeholder="Webhook URL"
            defaultValue={action.config.url || ''}
            onChange={(e) => {
              const newActions = [...formData.actions];
              newActions[index].config.url = e.target.value;
              setFormData({ ...formData, actions: newActions });
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>
          Automations
        </h1>
        <button
          onClick={() => setShowBuilder(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          New Automation
        </button>
      </div>

      {automations.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
          padding: '40px 20px',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0', fontSize: '16px', color: '#666', marginBottom: '8px' }}>
            No automations yet
          </p>
          <p style={{ margin: '0', fontSize: '14px', color: '#999' }}>
            Create your first automation to get started
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {automations.map((automation) => (
            <div
              key={automation.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e5e5',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>
                  {automation.name}
                </h3>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#666' }}>
                  Trigger: <span style={{ fontWeight: '500' }}>{getTriggerLabel(automation.trigger_type)}</span>
                </p>
                {automation.n8n_workflow_id && (
                  <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                    Workflow: {automation.n8n_workflow_id}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>
                  <input
                    type="checkbox"
                    checked={automation.is_active}
                    onChange={() => handleToggleActive(automation)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: '#666' }}>
                    {automation.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>

                <button
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    backgroundColor: '#f5f5f5',
                    color: '#1a1a1a',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Edit2 size={14} />
                  Edit
                </button>

                <button
                  onClick={() => handleDeleteAutomation(automation.id)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    backgroundColor: '#fff5f5',
                    color: '#dc2626',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuilder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '600', color: '#1a1a1a' }}>
                Automation Builder
              </h2>
              <button
                onClick={() => setShowBuilder(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a' }}>
                  Automation Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Welcome New Contacts"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>
                  Trigger (Select one)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {TRIGGER_OPTIONS.map((option) => (
                    <label key={option.value} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: formData.trigger === option.value ? '#f5f5f5' : 'white',
                    }}>
                      <input
                        type="radio"
                        name="trigger"
                        value={option.value}
                        checked={formData.trigger === option.value}
                        onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: '#1a1a1a' }}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: '0', fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>
                    Actions (Add multiple)
                  </h3>
                  <button
                    onClick={handleAddAction}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={16} />
                    Add Action
                  </button>
                </div>

                {formData.actions.length === 0 ? (
                  <p style={{ margin: '0', fontSize: '13px', color: '#999', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                    Add actions to execute when the trigger fires
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {formData.actions.map((action, index) => (
                      <div key={index} style={{
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        padding: '12px',
                        backgroundColor: '#f5f5f5',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <select
                            value={action.type}
                            onChange={(e) => {
                              const newActions = [...formData.actions];
                              newActions[index].type = e.target.value;
                              newActions[index].config = {};
                              setFormData({ ...formData, actions: newActions });
                            }}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid #e5e5e5',
                              borderRadius: '6px',
                              fontSize: '13px',
                              marginRight: '8px',
                            }}
                          >
                            <option value="">Select action type</option>
                            {ACTION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRemoveAction(index)}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#fff5f5',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              fontSize: '13px',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        {action.type && renderActionConfig(action, index)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowBuilder(false)}
                  style={{
                    padding: '10px 20px',
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
                  onClick={handleSaveAutomation}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Save Automation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Automations;
