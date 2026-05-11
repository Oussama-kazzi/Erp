import React from 'react';

const Table = ({ columns, data, loading, emptyMessage = 'No data found' }) => {
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
      <p className="text-sm text-sand-400">Loading...</p>
    </div>
  );

  if (!data?.length) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-sand-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <p className="text-sm text-sand-400">{emptyMessage}</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-sand-100 bg-sand-50">
            {columns.map((col) => (
              <th key={col.key} className="table-th">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row._id || i} className="table-row">
              {columns.map((col) => (
                <td key={col.key} className="table-td">
                  {col.render ? col.render(row) : row[col.key] ?? <span className="text-sand-300">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
