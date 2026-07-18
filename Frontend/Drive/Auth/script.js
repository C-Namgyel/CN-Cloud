function api(path) {
    // return `https://api.xraiga.dev${path}`;
    return `http://localhost:8080${path}`;
}
function disableBtns(dis = true) {
  document.getElementById("loginBtn").disabled = dis;
}
async function login(event) {
  event.preventDefault();

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  document.getElementById('loginMsg').innerText = "Loggin In...";
  disableBtns(true);

  fetch(api("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(response => {
    if (response.success) {
      document.getElementById("loginMsg").innerText = "Successfully Logged In";
      localStorage.setItem("username", response.data.username)
      localStorage.setItem("uuid", response.data.uuid);
      localStorage.setItem("token", response.data.token);
      window.open(window.location.origin, "_self");
    } else {
      document.getElementById("loginMsg").innerText = response.error;
    }
    disableBtns(false);
  });
}
if (localStorage.getItem("uuid") && localStorage.getItem("token")) {
  window.open(window.location.origin, "_self");
}