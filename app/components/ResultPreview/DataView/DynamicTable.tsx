/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DynamicTable({
  hrefFn,
  dbName,
  headers,
  rows,
  th = '_id',
  link = ['_id'],
  onRowClick = () => {},
}: any) {
  return (
    <div className="relative mt-[40px] max-h-[calc(100vh-140px)] overflow-x-auto overflow-y-auto">
      <table className="text-light-primary dark:text-dark-primary w-full border-collapse text-left">
        <thead className="dark:bg-dark-background-00 sticky top-0 z-10 bg-white">
          <tr key={'header' + Math.random()}>
            {headers.map((header: string) => (
              <th
                key={header}
                scope="col"
                className="text-11 text-accent-01 dark:text-accent-01 px-[15px] py-[8px]"
              >
                {header === '_id' ? 'doc id' : header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-14 border-light-decorative-01 dark:border-dark-decorative-00 dark:bg-dark-background-01 border bg-white">
          {rows.map((fields: any) => (
            <tr
              key={fields._id}
              className="border-light-decorative-01 hover:bg-light-background-01 dark:border-dark-decorative-00 dark:hover:bg-dark-decorative-00 cursor-pointer border-b"
              onClick={() => {
                onRowClick(fields._id, dbName);
              }}
            >
              {headers.map((header: string) =>
                header === th ? (
                  <th
                    key={header}
                    scope="row"
                    className="px-[15px] py-[12px] text-xs whitespace-nowrap"
                  >
                    {formatTableCellContent(fields[header], header)}
                  </th>
                ) : (
                  <td
                    key={header}
                    className="px-[15px] py-[12px] text-xs"
                    title="Click to copy"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent row click handler from firing
                      const originalValue =
                        fields[header] !== undefined
                          ? typeof fields[header] === 'string'
                            ? fields[header]
                            : JSON.stringify(fields[header])
                          : '';
                      navigator.clipboard.writeText(originalValue);
                    }}
                  >
                    {formatTableCellContent(fields[header], header)}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTableCellContent(obj: any, header: string): string {
  if (obj === undefined) return '';
  if (header === '_id') return obj.substring(0, 4) + '..' + obj.substring(obj.length - 4);
  const strOut = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  return strOut.length > 30 ? `${strOut.substring(0, 25).trim()}...` : strOut;
}
