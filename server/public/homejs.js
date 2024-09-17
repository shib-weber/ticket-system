const socket = io(); 

async function fetchTicketStats() {
    const response = await fetch('/api/admin/ticket-stats');
    const data = await response.json();
    return data.map(ticket => ({
        date: ticket._id,
        count: ticket.tickets
    }));
}

async function initChart() {
    const ticketStats = await fetchTicketStats();
    const ctx = document.getElementById('ticketChart').getContext('2d');
    const ticketChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ticketStats.map(stat => stat.date),
            datasets: [{
                label: 'Number of Tickets Booked',
                data: ticketStats.map(stat => stat.count),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                barThickness: 50, 
                categoryPercentage: 0.9, 
                barPercentage: 0.8,
            }]
        },
        options: {
            scales: {
                x:{
                    beginAtZero:arguments,
                    offset: false,
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    

    socket.on('update-ticket-stats', (updatedStats) => {
        const updatedData = updatedStats.map(stat => ({
            date: stat._id,
            count: stat.tickets
        }));

        ticketChart.data.labels = updatedData.map(stat => stat.date);
        ticketChart.data.datasets[0].data = updatedData.map(stat => stat.count);
        ticketChart.update();
    });
}

async function controlBooking(action) {
    try {
        const response = await fetch('/api/admin/control-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: action }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        console.log('Control booking response:', result);
    } catch (error) {
        console.error('Error controlling booking:', error);
    }
}

document.getElementById('startBooking').addEventListener('click', () => controlBooking('start'));
document.getElementById('stopBooking').addEventListener('click', () => controlBooking('stop'));


document.getElementById('logout').addEventListener('click', async () => {
    await fetch('/api/admin/logout');
    window.location.href = 'login';
});

initChart();

async function fetchTicketStats2() {
    const response = await fetch('/api/admin/ticket-stats2');
    const data = await response.json();
    return data.map(ticket => ({
        date: ticket._id,
        count: ticket.tickets
    }));
}

async function initChart2() {
    const ticketStats = await fetchTicketStats2();
    const ctx = document.getElementById('ticketChart2').getContext('2d');
    const ticketChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ticketStats.map(stat => stat.date),
            datasets: [{
                label: 'Number of Tickets Booked',
                data: ticketStats.map(stat => stat.count),
                backgroundColor: 'rgba(255, 182, 193, 0.2)', 
                borderColor: 'rgba(255, 105, 180, 1)',
                borderWidth: 1,
                barThickness: 50, 
                categoryPercentage: 0.8, 
                barPercentage: 0.9,
            }]
        },
        options: {

            scales: {
                x:{
                    beginAtZero:false,
                    grid: {
                        display: false 
                    },


                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    

    socket.on('update-ticket-stats2', (updatedStats) => {
        const updatedData = updatedStats.map(stat => ({
            date: stat._id,
            count: stat.tickets
        }));

        ticketChart.data.labels = updatedData.map(stat => stat.date);
        ticketChart.data.datasets[0].data = updatedData.map(stat => stat.count);
        ticketChart.update();
    });
}


initChart2();
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/admin/users');
        const categorizedUsers = await response.json();

        const userTable = document.getElementById('userTable');
        userTable.innerHTML = ''; // Clear any existing content

        for (const category in categorizedUsers) {
            const users = categorizedUsers[category];

            // Create a category header
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = category;
            userTable.appendChild(categoryHeader);

            // Create a table for the users in this category
            const table = document.createElement('table');
            const tableHeader = `
                <thead>
                    <tr>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Date of Birth</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Address</th>
                        <th>Event Date</th>
                        <th>Tickets</th>
                        <th>Discount Code</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;
            table.innerHTML = tableHeader;

            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.fname}</td>
                    <td>${user.lname}</td>
                    <td>${new Date(user.dob).toLocaleDateString()}</td>
                    <td>${user.email}</td>
                    <td>${user.phone}</td>
                    <td>${user.address}</td>
                    <td>${new Date(user.date).toLocaleDateString()}</td>
                    <td>${user.tickets}</td>
                    <td>${user.discountCode || 'N/A'}</td>
                `;
                table.querySelector('tbody').appendChild(row);
            });

            userTable.appendChild(table);
        }
    } catch (error) {
        console.error("Error fetching users:", error);
    }
});

fetchUsers();

router.get('/download/pdf', async (req, res) => {
    try {
        const users = await Booking.find().lean(); // Fetch user data
        const doc = new PDFDocument();
        const filePath = 'users.pdf';
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        users.forEach(user => {
            doc.text(`Name: ${user.fname} ${user.lname}, Email: ${user.email}, Tickets: ${user.tickets}`);
            doc.moveDown();
        });

        doc.end();

        stream.on('finish', () => {
            res.download(filePath, err => {
                if (err) {
                    res.status(500).send("Error downloading the PDF");
                } else {
                    fs.unlinkSync(filePath); // Remove the file after download
                }
            });
        });
    } catch (error) {
        res.status(500).send("Error exporting data to PDF");
    }
});

router.get('/download/pdf', async (req, res) => {
    try {
        const users = await Booking.find().lean(); // Fetch user data
        const doc = new PDFDocument();
        const filePath = 'users.pdf';
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        users.forEach(user => {
            doc.text(`Name: ${user.fname} ${user.lname}, Email: ${user.email}, Tickets: ${user.tickets}`);
            doc.moveDown();
        });

        doc.end();

        stream.on('finish', () => {
            res.download(filePath, err => {
                if (err) {
                    res.status(500).send("Error downloading the PDF");
                } else {
                    fs.unlinkSync(filePath); // Remove the file after download
                }
            });
        });
    } catch (error) {
        res.status(500).send("Error exporting data to PDF");
    }
});

