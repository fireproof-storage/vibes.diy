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
    <div className="relative mt-[40px] overflow-x-scroll">
      <table className="text-fp-p w-full border-collapse text-left">
        <thead className="relative z-10">
          <tr key={'header' + Math.random()}>
            {headers.map((header: string) => (
              <th key={header} scope="col" className="text-11 text-fp-dec-02 px-[15px] py-[8px]">
                {header === '_id' ? 'document id' : header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-fp-bg-00 border-fp-dec-00 text-14 border">
          {rows.map((fields: any) => (
            <tr
              key={fields._id}
              className="hover:bg-fp-bg-02 border-fp-dec-00 cursor-pointer border-b"
              onClick={() => {
                onRowClick(fields._id, dbName);
              }}
            >
              {headers.map((header: string) =>
                header === th ? (
                  <th
                    key={header}
                    scope="row"
                    className="text-14 px-[15px] py-[12px] whitespace-nowrap"
                  >
                    {formatTableCellContent(fields[header])}
                  </th>
                ) : (
                  <td key={header} className="px-[15px] py-[12px]">
                    {formatTableCellContent(fields[header])}
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

function formatTableCellContent(obj: any): string {
  if (obj === undefined) return '';
  const strOut = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  return strOut.length > 100 ? `${strOut.substring(0, 100)}...` : strOut;
}
