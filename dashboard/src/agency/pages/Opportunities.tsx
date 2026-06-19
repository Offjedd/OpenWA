import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Pipeline, Opportunity, AgencyContact } from '../types';

interface PipelineSelectProps {
  pipelines: Pipeline[];
  selectedPipelineId: string;
  onSelect: (id: string) => void;
}

function PipelineSelect({ pipelines, selectedPipelineId, onSelect }: PipelineSelectProps) {
  return (
    <select
      value={selectedPipelineId}
      onChange={(e) => onSelect(e.target.value)}
      style={{
        padding: '10px 12px',
        border: '1px solid #e5e5e5',
        borderRadius: '8px',
        fontSize: '14px',
        backgroundColor: 'white',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: '600',
      }}
    >
      {pipelines.map((pipeline) => (
        <option key={pipeline.id} value={pipeline.id}>
          {pipeline.name}
        </option>
      ))}
    </select>
  );
}

interface NewOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Opportunity>) => void;
  isLoading: boolean;
  selectedPipelineId: string;
  selectedStage: string;
  contacts: AgencyContact[];
  stages: string[];
}

function NewOpportunityModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  selectedPipelineId,
  selectedStage,
  contacts,
  stages,
}: NewOpportunityModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    contact_id: '',
    stage: selectedStage,
    value: '',
    close_date: '',
    notes: '',
  });
  const [searchContact, setSearchContact] = useState('');

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) =>
      c.name.toLowerCase().includes(searchContact.toLowerCase())
    );
  }, [contacts, searchContact]);

  const handleSubmit = () => {
    if (!formData.title.trim()) return;
    onSubmit({
      title: formData.title,
      contact_id: formData.contact_id || null,
      pipeline_id: selectedPipelineId,
      stage: formData.stage,
      value: formData.value ? parseFloat(formData.value) : 0,
      close_date: formData.close_date || null,
      notes: formData.notes || null,
    });
    setFormData({
      title: '',
      contact_id: '',
      stage: selectedStage,
      value: '',
      close_date: '',
      notes: '',
    });
    setSearchContact('');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#000' }}>New Opportunity</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Title *
            </label>
            <input
              type="text"
              placeholder="Opportunity title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Contact
            </label>
            <input
              type="text"
              placeholder="Search contact..."
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                marginBottom: '8px',
              }}
            />
            {searchContact && filteredContacts.length > 0 && (
              <div
                style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}
              >
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setFormData({ ...formData, contact_id: contact.id });
                      setSearchContact(contact.name);
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #e5e5e5',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f9f9f9';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: '500', color: '#000' }}>{contact.name}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{contact.email || '-'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Stage
            </label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            >
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Value (SAR)
            </label>
            <input
              type="number"
              placeholder="0"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Close Date
            </label>
            <input
              type="date"
              value={formData.close_date}
              onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Notes
            </label>
            <textarea
              placeholder="Additional notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={isLoading}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s ease',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !formData.title.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: isLoading || !formData.title.trim() ? '#ccc' : '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading || !formData.title.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

interface ManagePipelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePipeline: (name: string, stages: string[]) => void;
  isLoading: boolean;
}

function ManagePipelinesModal({
  isOpen,
  onClose,
  onCreatePipeline,
  isLoading,
}: ManagePipelinesModalProps) {
  const [name, setName] = useState('');
  const [stagesText, setStagesText] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !stagesText.trim()) return;
    const stages = stagesText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);
    if (stages.length === 0) return;
    onCreatePipeline(name, stages);
    setName('');
    setStagesText('');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#000' }}>
          Create Pipeline
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Pipeline Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Sales Pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
              Stages (comma-separated) *
            </label>
            <textarea
              placeholder="New Lead, Contacted, Proposal Sent, Won, Lost"
              value={stagesText}
              onChange={(e) => setStagesText(e.target.value)}
              disabled={isLoading}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !name.trim() || !stagesText.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor:
                isLoading || !name.trim() || !stagesText.trim()
                  ? '#ccc'
                  : '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor:
                isLoading || !name.trim() || !stagesText.trim()
                  ? 'not-allowed'
                  : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

interface KanbanCardProps {
  opportunity: Opportunity;
  isDragging?: boolean;
}

function KanbanCard({ opportunity, isDragging }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: opportunity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...(style as React.CSSProperties),
        backgroundColor: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '8px',
        cursor: 'grab',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            color: '#ccc',
            marginTop: '2px',
            flex: '0 0 auto',
          }}
        >
          <GripVertical size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '600', color: '#000', marginBottom: '4px', fontSize: '14px' }}>
            {opportunity.title}
          </div>
          {opportunity.contact && (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              {opportunity.contact.name}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#7c3aed' }}>
              {opportunity.value.toLocaleString()} SAR
            </div>
            {opportunity.close_date && (
              <div style={{ fontSize: '11px', color: '#999' }}>
                {new Date(opportunity.close_date).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  stage: string;
  opportunities: Opportunity[];
  pipelineId: string;
  onNewOpportunity: (stage: string) => void;
}

function KanbanColumn({ stage, opportunities, onNewOpportunity }: Omit<KanbanColumnProps, 'pipelineId'> & { pipelineId?: string }) {
  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);

  return (
    <div
      style={{
        flex: '1 0 300px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        padding: '12px',
        minHeight: '500px',
        border: '1px solid #e5e5e5',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '4px' }}>
          {stage}
        </h3>
        <p style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>
          {totalValue.toLocaleString()} SAR
        </p>
      </div>

      <SortableContext
        items={opportunities.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        {opportunities.map((opp) => (
          <KanbanCard key={opp.id} opportunity={opp} />
        ))}
      </SortableContext>

      <button
        onClick={() => onNewOpportunity(stage)}
        style={{
          width: '100%',
          padding: '10px',
          marginTop: '12px',
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          color: '#7c3aed',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fafafa';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white';
        }}
      >
        + Add Card
      </button>
    </div>
  );
}

export function Opportunities() {
  const { subAccountId } = useOutletContext<{ subAccountId: string }>();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contacts, setContacts] = useState<AgencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newOpportunityOpen, setNewOpportunityOpen] = useState(false);
  const [selectedStageForNew, setSelectedStageForNew] = useState('');
  const [managePipelinesOpen, setManagePipelinesOpen] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    if (subAccountId) {
      loadInitialData();
    }
  }, [subAccountId]);

  useEffect(() => {
    if (selectedPipelineId) {
      loadOpportunities();
    }
  }, [selectedPipelineId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load pipelines
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('sub_account_id', subAccountId)
        .order('created_at', { ascending: true });

      if (pipelinesError) throw pipelinesError;

      if (pipelinesData && pipelinesData.length > 0) {
        setPipelines(pipelinesData);
        setSelectedPipelineId(pipelinesData[0].id);
      } else {
        // Create default pipeline
        const defaultPipeline: Partial<Pipeline> = {
          sub_account_id: subAccountId,
          name: 'Sales Pipeline',
          stages: ['New Lead', 'Contacted', 'Proposal Sent', 'Won', 'Lost'],
        };

        const { data: newPipeline, error: createError } = await supabase
          .from('pipelines')
          .insert(defaultPipeline)
          .select()
          .single();

        if (createError) throw createError;

        setPipelines([newPipeline]);
        setSelectedPipelineId(newPipeline.id);
      }

      // Load contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('agency_contacts')
        .select('*')
        .eq('sub_account_id', subAccountId)
        .order('name', { ascending: true });

      if (contactsError) throw contactsError;

      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select(
          `
          *,
          contact:agency_contacts(*)
        `
        )
        .eq('pipeline_id', selectedPipelineId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOpportunities(data || []);
    } catch (error) {
      console.error('Error loading opportunities:', error);
    }
  };

  const handleCreateOpportunity = async (data: Partial<Opportunity>) => {
    try {
      setIsCreating(true);
      const { error } = await supabase.from('opportunities').insert({
        sub_account_id: subAccountId,
        ...data,
      });

      if (error) throw error;

      setNewOpportunityOpen(false);
      await loadOpportunities();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      alert('Failed to create opportunity');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreatePipeline = async (name: string, stages: string[]) => {
    try {
      setIsCreating(true);
      const { data: newPipeline, error } = await supabase
        .from('pipelines')
        .insert({
          sub_account_id: subAccountId,
          name,
          stages,
        })
        .select()
        .single();

      if (error) throw error;

      setPipelines([...pipelines, newPipeline]);
      setManagePipelinesOpen(false);
    } catch (error) {
      console.error('Error creating pipeline:', error);
      alert('Failed to create pipeline');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedOpp = opportunities.find((o) => o.id === active.id);
    if (!draggedOpp) return;

    const newStage = opportunities.find((o) => o.id === over.id)?.stage || over.id;

    if (draggedOpp.stage === newStage) return;

    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ stage: newStage })
        .eq('id', draggedOpp.id);

      if (error) throw error;

      await loadOpportunities();
    } catch (error) {
      console.error('Error updating opportunity stage:', error);
      alert('Failed to move opportunity');
    }
  };

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages || [];

  const opportunitiesByStage = stages.map((stage) =>
    opportunities.filter((opp) => opp.stage === stage)
  );

  if (loading) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: '#999' }}>Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#000' }}>Opportunities</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {pipelines.length > 0 && (
              <PipelineSelect
                pipelines={pipelines}
                selectedPipelineId={selectedPipelineId}
                onSelect={setSelectedPipelineId}
              />
            )}
            <button
              onClick={() => setManagePipelinesOpen(true)}
              style={{
                padding: '10px 16px',
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: '#666',
              }}
            >
              Manage Pipelines
            </button>
            <button
              onClick={() => {
                setSelectedStageForNew(stages[0] || '');
                setNewOpportunityOpen(true);
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={18} />
              New Opportunity
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px' }}>
            {stages.map((stage, index) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                opportunities={opportunitiesByStage[index]}
                pipelineId={selectedPipelineId}
                onNewOpportunity={(s) => {
                  setSelectedStageForNew(s);
                  setNewOpportunityOpen(true);
                }}
              />
            ))}
          </div>
          <DragOverlay>
            {activeId ? (
              <KanbanCard
                opportunity={opportunities.find((o) => o.id === activeId)!}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <NewOpportunityModal
        isOpen={newOpportunityOpen}
        onClose={() => setNewOpportunityOpen(false)}
        onSubmit={handleCreateOpportunity}
        isLoading={isCreating}
        selectedPipelineId={selectedPipelineId}
        selectedStage={selectedStageForNew}
        contacts={contacts}
        stages={stages}
      />

      <ManagePipelinesModal
        isOpen={managePipelinesOpen}
        onClose={() => setManagePipelinesOpen(false)}
        onCreatePipeline={handleCreatePipeline}
        isLoading={isCreating}
      />
    </div>
  );
}
