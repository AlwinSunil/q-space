import { useAuth } from "../context/AuthContext";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
      <a href="/" className="text-2xl font-semibold">
        <span className="italic">Re-</span>Learn
      </a>
      <div className="flex items-center gap-4">
        <a href="/history" className="text-gray-700 hover:text-gray-900 font-medium">History</a>
        <a href="/settings" className="text-gray-700 hover:text-gray-900 font-medium">Settings</a>
        <div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <img
                src={user.profileImage}
                alt="Profile menu"
                className="h-8 w-8 cursor-pointer rounded-full border border-gray-200"
              />
            </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="flex w-60 rounded-xl flex-col gap-1.5 border border-gray-200 bg-white px-2 py-2 text-sm backdrop:blur-lg"
              align="end"
            >
              <DropdownMenu.Label className="flex flex-col px-1.5 pt-1 font-medium">
                <span className="text-base font-medium">
                  {user.displayName}
                </span>
                <span className="font-xs text-gray-500">{user.email}</span>
              </DropdownMenu.Label>

              <DropdownMenu.Separator className="mx-0.5 my-0.5 h-0.5 bg-gray-200" />

              <div className="px-1.5 flex flex-col gap-1.5">
                <DropdownMenu.Item className="focus:outline-none justify-between text-xs flex gap-1 items-center">
                  Total Quiz Count:
                  <span className="border px-1 py-0.5 bg-gray-100 font-medium rounded">
                    {user.quizCount}
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="focus:outline-none justify-between text-xs flex gap-1 items-center">
                  Ongoing generations:{" "}
                  <span className="border px-1 py-0.5 bg-gray-100 font-medium rounded">
                    {user.quizCount}/5
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="focus:outline-none justify-between text-xs flex gap-1 items-center">
                  Learning Goals:{" "}
                  <span className="border px-1 py-0.5 bg-gray-100 font-medium rounded">
                    {user.learningGoals || "N/A"}
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="focus:outline-none justify-between text-xs flex gap-1 items-center">
                  Academic Level:{" "}
                  <span className="border px-1 py-0.5 bg-gray-100 font-medium rounded">
                    {user.academicLevel || "N/A"}
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="focus:outline-none justify-between text-xs flex gap-1 items-center">
                  Interests:{" "}
                  <span className="border px-1 py-0.5 bg-gray-100 font-medium rounded">
                    {user.interests || "N/A"}
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="focus:outline-none justify-between text-xs flex gap-1 items-center">
                  API Key Status:{" "}
                  <span
                    className={`border px-1 py-0.5 font-medium rounded ${
                      user.userAPIKey?.isValid
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {user.userAPIKey?.isValid ? "Valid" : "Invalid"}
                  </span>
                </DropdownMenu.Item>
              </div>

              <DropdownMenu.Separator className="mx-0.5 my-0.5 h-0.5 bg-gray-200" />

              <DropdownMenu.Item className="focus:outline-none">
                <button className="w-full rounded-lg focus-within:outline-none bg-red-500 px-3 py-1 font-medium text-white hover:bg-red-600">
                  Sign out
                </button>
              </DropdownMenu.Item>
              <DropdownMenu.Arrow />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
    </div>
  );
}
