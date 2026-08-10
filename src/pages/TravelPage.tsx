import React, { useState } from 'react';
import { useTravel } from '../hooks/useTravel';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import type { Travel } from '../types';
import { Plus, MapPin } from 'lucide-react';

export const TravelPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const { data: res, isLoading, isError, refetch } = useTravel({ search, status: statusFilter });
  const travelList = res?.data || [];

  const columns: Column<Travel>[] = [
    { key: 'engineerName', header: 'Engineer Name', sortable: true, render: (t) => <span className="font-semibold text-slate-800 dark:text-slate-200">{t.engineerName}</span> },
    { key: 'originCountry', header: 'Origin', sortable: true, render: (t) => <div className="flex items-center space-x-1 text-xs"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>{t.originCountry}</span></div> },
    { key: 'destinationCountry', header: 'Destination', sortable: true, render: (t) => <div className="flex items-center space-x-1 text-xs font-semibold text-[var(--color-secondary)]"><MapPin className="w-3.5 h-3.5" /><span>{t.destinationCountry}</span></div> },
    { key: 'departureDate', header: 'Departure Date', sortable: true },
    { key: 'returnDate', header: 'Return Date', sortable: true },
    { key: 'flightNumber', header: 'Flight / Hotel Booking', render: (t) => <div className="text-xs space-y-0.5"><p className="font-mono text-slate-700 dark:text-slate-300">{t.flightNumber}</p><p className="text-[11px] text-slate-400">{t.hotelBooking}</p></div> },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (t) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
          {t.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Field Mobility & Travel Operations"
        subtitle="Manage flight bookings, hotel reservations, and emergency travel dispatches."
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => alert('FastAPI Create Travel Endpoint')}>Book Field Travel</Button>}
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search by engineer, origin, destination, flight number..." />
        <div className="w-full sm:w-48">
          <Dropdown value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={['All', 'Confirmed', 'Pending Approval', 'In Transit', 'Completed']} />
        </div>
      </div>

      <Table columns={columns} data={travelList} isLoading={isLoading} isError={isError} onRetry={refetch} emptyTitle="No Travel Itineraries Found" />
    </div>
  );
};
