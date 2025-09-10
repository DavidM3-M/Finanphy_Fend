export default function Table({ headers, data }) {
  return (
    <table className="min-w-full bg-white shadow rounded">
      <thead className="bg-gray-200">
        <tr>
          {headers.map((h, index) => (
            <th key={index} className="py-2 px-4 text-left">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length > 0 ? (
          data.map((row, index) => (
            <tr key={index} className="border-b hover:bg-gray-50">
              {Object.values(row).map((val, i) => (
                <td key={i} className="py-2 px-4">{val}</td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={headers.length} className="text-center py-4">
              No hay datos
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
