-- roblox_download_example.lua
-- Example Roblox script (server-side) using HttpService to download an uploaded file.
-- IMPORTANT: Keep the token secret on the server side (not in client scripts).

local HttpService = game:GetService("HttpService")
local https = true -- use https in production

local SERVER_HOST = "http://your-server.example.com" -- change to your server URL (use https)
local FILE_ID = "paste_file_id_here" -- obtain from server response after upload
local ROBLOX_TOKEN = "replace_with_the_same_secret_as_server" -- keep this secret in server-only context

local function downloadFile(fileId)
    local url = string.format("%s/download/%s", SERVER_HOST, fileId)
    local headers = {
        ["X-Roblox-Token"] = ROBLOX_TOKEN
    }

    local success, response = pcall(function()
        -- GetAsync supports headers via second parameter in some contexts; using RequestAsync for headers
        local result = HttpService:RequestAsync({
            Url = url,
            Method = "GET",
            Headers = headers,
            -- If you expect a binary, set ReturnRawBody to true if available. Many times the body is returned as text.
        })
        return result
    end)

    if not success then
        warn("HTTP request failed:", response)
        return nil
    end

    if not response.Success then
        warn("Download failed:", response.StatusCode, response.StatusMessage)
        return nil
    end

    -- response.Body may contain the binary data as a string. How you use it depends on what you plan to do.
    -- Example: if it's an image and you want to upload it to Roblox as an asset, you'd need to forward it to Roblox asset API (not covered here).
    print("Downloaded bytes length:", #response.Body)
    return response.Body
end

-- Example usage
local data = downloadFile(FILE_ID)
if data then
    -- process data...
    print("Downloaded data size:", #data)
end
