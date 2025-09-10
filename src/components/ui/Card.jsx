export default function Card({ title, children }) {
  return (
    <div className="bg-white shadow rounded p-4">
      {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
      <div>{children}</div>
    </div>
  );
}
