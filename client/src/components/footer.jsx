const creators = [
  {
    name: "Mugilan",
    img: "https://avatars.githubusercontent.com/u/110448011?v=4",
    link: "https://github.com/mugilankani/",
  },
  {
    name: "Alwin",
    img: "https://avatars.githubusercontent.com/u/64636626?s=400&u=391c2a7dcbc6349e0a908b7bfc5be9047e4352a6",
    link: "https://github.com/AlwinSunil",
  },
];

export default function Footer() {
  return (
    <footer className="bg-white shadow-md border-t border-gray-200">
      <div className="relative flex justify-between px-4 py-2">
        <p className="font-medium">
          <i>Re-</i>Learn
        </p>
        <div className="flex gap-1.5 text-sm items-center font-normal">
          Made with ❤️ from
          <span className="group relative">
            <span className="cursor-pointer font-medium text-violet-600 underline decoration-dotted">
              Strix
            </span>
            <div className="invisible absolute right-0 bottom-full mb-1 w-36 rounded-xl bg-white p-1.5 font-serif font-normal opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
              <div className="flex flex-col">
                {creators.map((creator, index) => (
                  <a
                    href={creator.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={index}
                    className="group/link flex cursor-pointer items-center gap-2 rounded-lg border !border-white px-1.5 py-1 text-sm font-medium text-black hover:border-gray-200 hover:bg-gray-100"
                  >
                    <img
                      src={creator.img}
                      alt={creator.name}
                      className="h-5 w-5 rounded-full"
                    />
                    <p className="mt-0.5">{creator.name}</p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="ml-auto h-3 w-3 text-gray-800 opacity-0 transition-opacity group-hover/link:opacity-100"
                    >
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </span>
        </div>
      </div>
    </footer>
  );
}
