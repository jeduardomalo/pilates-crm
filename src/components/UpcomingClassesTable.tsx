import { format } from "date-fns";

interface UpcomingClass {
  id: string;
  start: string;
  end: string;
  type: string;
  location: string;
  usePackage: boolean;
  price: string;
  clientNames: string[];
}

/**
 * Shows the client's scheduled (calendar) classes that have not been posted yet,
 * so newly scheduled classes are immediately visible on the client profile.
 */
export function UpcomingClassesTable({ classes }: { classes: UpcomingClass[] }) {
  if (!classes?.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-xl text-charcoal">Scheduled Classes</h3>
        <span className="text-xs uppercase tracking-widest text-gray-400 font-medium">
          {classes.length} not posted yet
        </span>
      </div>
      <div className="w-full overflow-x-auto rounded-xl border border-sand-200 shadow-sm bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-50 border-b border-sand-200">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs">Date</th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs">Client(s)</th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs">Type</th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs">Location</th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs text-right">Price</th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs text-center">Package</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {classes.map((cls) => (
              <tr key={cls.id} className="hover:bg-sand-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {format(new Date(cls.start), "MMM d, yyyy")}
                  <span className="text-gray-400"> · </span>
                  {format(new Date(cls.start), "h:mm a")}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {cls.clientNames.join(", ")}
                </td>
                <td className="px-6 py-4 text-gray-600">{cls.type}</td>
                <td className="px-6 py-4 text-gray-600">{cls.location}</td>
                <td className="px-6 py-4 text-right text-gray-600">
                  {cls.usePackage ? "$0.00" : `$${Number(cls.price).toFixed(2)}`}
                </td>
                <td className="px-6 py-4 text-center">
                  {cls.usePackage ? (
                    <span className="text-sage font-medium">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}