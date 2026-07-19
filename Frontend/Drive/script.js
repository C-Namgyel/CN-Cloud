// Auth
let uuid = "";
let token = "";

let index = new Map();
index.set("/", []);
let dir = "/";

// Functions
function showLoading(text) {
    document.getElementById("loading-text").innerText = text;
    document.getElementById("loading-container").style.display = "flex";
}
function hideLoading() {
    document.getElementById("loading-container").style.display = "none";
}
function toggleMenu() {
    const el = document.getElementById("add-list");
    el.classList.toggle("active");
}
function convertByte(byte) {
    if (byte > 1024 ** 3) return (byte / 1024 ** 3).toFixed(2) + " GB";
    if (byte > 1024 ** 2) return (byte / 1024 ** 2).toFixed(2) + " MB";
    if (byte > 1024) return (byte / 1024).toFixed(2) + " KB";
    return byte + " B";
}
function buildIndex(tree, map = new Map()) {
    for (const node of tree) {
        const parent = node.path.split("/").slice(0, -1).join("/") || "/";
        if (!map.has(parent)) {
            map.set(parent, []);
        }
        map.get(parent).push(node);
    }
    return map;
}
function listFiles(res) {
    const folders = res
        .filter(a => a.type === "folder")
        .sort((a, b) => a.name.localeCompare(b.name));
    const files = res
        .filter(a => a.type === "file")
        .sort((a, b) => a.name.localeCompare(b.name));
    const final = [...folders, ...files];
    const tbody = document.getElementById("fileTable");
    if (final.length <= 0) {
        tbody.innerHTML = "<td colspan=4><div style=\"margin: 25px; width: 100%; text-align: center; font-weight: bold; color: white;\">It's Empty Here<div></td>";
        return;
    } else {
        tbody.innerHTML = "";
    }
    for (const f of final) {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = f.type === "folder" ? "📁" : "📄";
        row.insertCell(1).innerHTML = `<div class="file-name"> ${f.name} </div>`;
        row.insertCell(2).innerText = f.type === "file" ? convertByte(f.size) : "-";
        row.insertCell(3);
        const actionBtn = document.createElement("button");
        actionBtn.className = "more-btn";
        actionBtn.innerText = "⋮";
        row.cells[3].appendChild(actionBtn);
        actionBtn.onclick = () => {
            document.getElementById("actionModal").classList.remove("hidden");
            document.getElementById("actionDelete").onclick = () => {
                if (confirm("Do you really want to delete this file? This cannot be undone") == false) return;
                showLoading("Deleting");
                fetch(api("/api/drive/delete"), {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "X-User-ID": uuid
                    },
                    body: JSON.stringify({
                        path: f.path
                    })
                })
                    .then(res => res.json())
                    .then(res => {
                        hideLoading();
                        if (res.success) {
                            index.set(backDir(f.path), index.get(backDir(f.path)).filter(a => a.name != f.name));
                            listFiles(index.get(backDir(f.path)));
                        } else {
                            console.error(res.error);
                        }
                        closeMenu();
                    })
            }
            document.getElementById("actionRename").onclick = () => {
                const newName = prompt("Enter new file name", f.name);
                if (newName.trim() == f.name || newName == null || newName == "") return;
                if (newName.includes("/")) {
                    alert("Invalid character found in file name");
                    return;
                }
                showLoading("Renaming");
                fetch(api("/api/drive/rename"), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "X-User-ID": uuid
                    },
                    body: JSON.stringify({
                        oldPath: f.path,
                        newPath: backDir(f.path) + "/" + newName
                    })
                })
                    .then(res => res.json())
                    .then(res => {
                        hideLoading();
                        if (res.success) {
                            let oldData = index.get(backDir(f.path)).find(a => a.name == f.name)
                            oldData.name = newName;
                            oldData.path = backDir(oldData.path) + "/" + newName
                            index.set(backDir(f.path), index.get(backDir(f.path)).filter(a => a.name != f.name));
                            index.get(backDir(f.path)).push(oldData);
                            listFiles(index.get(backDir(f.path)));
                        } else {
                            console.error(res.error);
                        }
                        closeMenu();
                    })
            }
            document.getElementById("actionDownload").onclick = () => {
                if (f.type == "folder") {
                    alert("Folder download not supported yet");
                    return;
                }
                window.open(
                    api("/api/drive/download?path=" + encodeURIComponent(f.path))
                );
                closeMenu();
            }
            document.getElementById("actionShare").onclick = () => {
                const share = f.path.substring(1);
                const url = `${window.location.origin}/share?path=${encodeURIComponent(share)}`;
                console.log(url);
            }

        }
        row.onclick = (e) => {
            if (e.target.className == "more-btn") return;
            if (f.type === "file") {
                console.log("Download:", f.name);
                return;
            }
            dir = f.path;
            const cache = index.get(dir);
            if (cache) {
                document.getElementById("dirUrl").innerText = dir;
                listFiles(cache);
                return;
            }
            showLoading("Loading...");
            fetch(api("/api/drive/getFiles?path=" + dir), {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-User-ID": uuid
                }
            })
                .then(r => r.json())
                .then(res => {
                    document.getElementById("dirUrl").innerText = dir;
                    hideLoading();
                    const temp = buildIndex(res.items);
                    index = new Map([...index, ...temp]);
                    listFiles(index.get(dir) || []);
                });
        };
    }
}
function backDir(dir) {
    return dir.split("/").slice(0, -1).join("/") || "/";;
}
function back() {
    if (dir === "/") return;
    dir = backDir(dir);
    document.getElementById("dirUrl").innerText = dir;
    loadDir(dir);
}
function loadDir(path) {
    const cached = index.get(path);
    if (cached.length != 0) {
        listFiles(cached);
        return;
    }
    showLoading("Loading...");
    fetch(api("/api/drive/getFiles?path=" + path), {
        headers: {
            "Authorization": `Bearer ${token}`,
            "X-User-ID": uuid
        }
    })
        .then(r => r.json())
        .then(res => {
            hideLoading();
            if (res.success) {
                if (!res.success) return;
                const temp = buildIndex(res.items);
                index = new Map([...index, ...temp]);
                listFiles(index.get(path) || []);
            } else {
                alert(res.error)
                if (res.error.includes("Unauthorized")) {
                    localStorage.clear();
                    location.replace("./Auth");
                }
                console.error(res.error)
            }
        });
}
function upload(input) {
    const file = input.files[0];
    if (!file) return;
    const uploadDir = dir;
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", api(`/api/drive/upload?path=${encodeURIComponent(dir)}`));
    xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const percent = Math.round((e.loaded / e.total) * 100);
        document.getElementById("uploadProgress").innerHTML = `${file.name} (${convertByte(e.loaded)} / ${convertByte(e.total)})<br><progress value="${percent / 100}"></progress> ${percent}%`;
    };
    xhr.onload = () => {
        document.getElementById("uploadProgress").innerText = "";
        if (index.get(uploadDir) == undefined) {
            index.set(uploadDir, []);
        }
        index.get(uploadDir).push({
            name: file.name,
            path: uploadDir,
            type: "file",
            size: file.size
        })
        document.getElementById("dirUrl").textContent = uploadDir;
        listFiles(index.get(uploadDir));
    };
    xhr.send(form);
}
function closeMenu() {
    document.getElementById("actionModal").classList.add("hidden")
}
function mkdir() {
    const fName = prompt("Enter new folder name", "New Folder").trim();
    if (fName == null || fName == "") return;
    fetch(api("/api/drive/mkdir"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-User-ID": uuid
        },
        body: JSON.stringify({
            path: dir + "/" + fName
        })
    })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                index.get(dir).push({
                    name: fName,
                    path: dir + fName,
                    size: 0,
                    type: "folder"
                });
                listFiles(index.get(dir));
            } else {
                console.error(res.error);
            }
        })
}
function logout() {
    localStorage.clear();
    window.location.replace("./Auth");
}

// Menu
document.addEventListener("click", (e) => {
    const menu = document.getElementById("add-list");
    const button = document.querySelector(".actions button");
    if (!menu.contains(e.target) && e.target !== button) {
        menu.classList.remove("active");
    }
});

// ---------- INIT ----------
showLoading("Loading")
fetch(api("/health"))
    .then(res => {
        if (localStorage.getItem("uuid") && localStorage.getItem("token") && localStorage.getItem("username")) {
            uuid = localStorage.getItem("uuid");
            token = localStorage.getItem("token");
            loadDir("/");
        } else {
            alert("Please login to access the drive");
            window.location.replace("./Auth");
        }
    })
    .catch(err => {
        if (err.message == "Failed to fetch") {
            showLoading("500: Internal Server Error");
            alert("500: Internal Server Error");
            document.write("500: Internal Server Error")
        }
        console.error(err.message)
    })