// Variables
let tree = [];
let index = {};
let dir = "/";

// Functions
function api(path) {
    return `${window.location.origin}${path}`;
}
function showLoading(text) {
    document.getElementById("loading-text").innerText = text;
    document.getElementById("loading-container").style.display = "flex";
}
function hideLoading() {
    document.getElementById("loading-container").style.display = "none";
}
function convertByte(byte) {
    if (byte > 1024 ** 4) {
        return (byte / (1024 ** 4)).toFixed(2) + " TB";
    } else if (byte > 1024 ** 3) {
        return (byte / (1024 ** 3)).toFixed(2) + " GB";
    } else if (byte > 1024 ** 2) {
        return (byte / (1024 ** 2)).toFixed(2) + " MB";
    } else if (byte > 1024) {
        return (byte / (1024)).toFixed(2) + " KB";
    } else {
        return byte + " B";
    }
}
function buildIndex(tree, map = new Map()) {
    for (const node of tree) {
        let tempDir = node.path.split("/");
        tempDir.pop();
        tempDir = tempDir.join("/");
        tempDir = tempDir == "" ? "/" : tempDir;
        if (map.get(tempDir) == undefined) {
            map.set(tempDir, [])
        }
        map.get(tempDir).push(node);
    }
    return map;
}
function listFiles(res) {
    const folders = res.filter(a => a.type == "folder").sort((a, b) => a.name.localeCompare(b.name));
    const files = res.filter(a => a.type == "file").sort((a, b) => a.name.localeCompare(b.name));
    const final = [...folders, ...files];
    document.getElementById("fileTable").innerHTML = "";
    for (let f of final) {
        const row = document.getElementById("fileTable").insertRow();
        row.insertCell(0).innerText = `${f.name} ${((f.type == "folder") ? "/" : "")}`;
        row.insertCell(1).innerText = f.type == "file" ? convertByte(f.size) : "-";
        row.insertCell(2).innerText = new Date(f.modifiedAt).toLocaleDateString() + " " + new Date(f.modifiedAt).toLocaleTimeString();
        row.insertCell(3).innerText = ":";
        row.onclick = () => {
            if (f.type == 'file') {
                console.log("Downloading file " + f.name)
            } else {
                dir = f.path;
                document.getElementById("dirUrl").innerText = dir;
                const cache = index.get(dir);
                if (cache == undefined) {
                    showLoading("Loading...");
                    fetch(api("/getFiles?path=/" + dir))
                        .then(res => res.json())
                        .then(res => {
                            hideLoading();
                            if (res.success) {
                                const temp = buildIndex(res.items);
                                const merged = new Map([...index, ...temp]);
                                index = merged;
                                listFiles(index.get(dir));
                            } else {
                                console.error(res.error);
                            }
                        })
                } else {
                    listFiles(cache);
                }
            }
        }
    }
}
function back() {
    if (dir == "/") {
        alert("Already at the root");
        return;
    }
    let tempDir = dir.split("/");
    tempDir.pop();
    dir = tempDir.join("/");
    dir = dir == "" ? "/" : dir;
    document.getElementById("dirUrl").innerText = dir;
    listFiles(index.get(dir));
}

// New Button
function showOptions() {
    document.getElementById("add-list").style.display = "flex";
}

// Upload Files
async function upload(e) {
    const file = e.files[0];
    if (!file) {
        alert("Choose a file first");
        return;
    }
    const uploadDir = dir;
    document.getElementById("uploadName").innerText = file.name;
    document.getElementById("uploadProgress").innerText = "Uploading...";
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload");
    xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
            const percent = Math.round(
                e.loaded / e.total * 100
            );
            document.getElementById("uploadProgress").innerText = `${convertByte(e.loaded)}/${convertByte(e.total)}   |   ${percent}%`;
        }
    };
    xhr.onload = function () {
        document.getElementById("uploadName").innerText = "";
        document.getElementById("uploadProgress").innerText = "";
        if (index.get(uploadDir) == undefined) {
            index.set(uploadDir, []);
        }
        index.get(uploadDir).push({
            name: file.name,
            path: uploadDir,
            type: "file",
            size: file.size,
            modifiedAt: new Date().getTime()
        })
        document.getElementById("dirUrl").textContent = uploadDir;
        listFiles(index.get(uploadDir));
    };
    xhr.send(form);
}

// Init
showLoading("Loading...");
fetch(api("/getFiles?path=/"))
    .then(res => res.json())
    .then(res => {
        hideLoading();
        if (res.success) {
            index = buildIndex(res.items);
            listFiles(index.get(dir));
        } else {
            console.error(res.error);
        }
    })