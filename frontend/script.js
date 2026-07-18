async function fetchStatus() {
  const statusBox = document.getElementById("status");
  try {
    const response = await fetch("/api/status");
    const data = await response.json();
    statusBox.innerHTML = `
      <p><span class="label">Status:</span> ${data.status}</p>
      <p><span class="label">Timestamp:</span> ${data.timestamp}</p>
      <p><span class="label">Message:</span> ${data.message}</p>
      <p><span class="label">Environment:</span> ${data.environment}</p>
    `;
  } catch (error) {
    statusBox.innerHTML = `<p>Error fetching status: ${error.message}</p>`;
  }
}

document.getElementById("refresh-btn").addEventListener("click", fetchStatus);

fetchStatus();
