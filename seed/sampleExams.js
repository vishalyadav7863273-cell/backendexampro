// Sample exams (pehle app.js mein hardcoded the) — ab server pehli baar start hone par DB mein seed hote hain.
module.exports = [
    {
      title: 'Introduction to Programming',
      subject: 'Computer Science',
      description: 'Basic programming concepts, algorithms, and problem solving',
      duration: 30,
      passingScore: 60,
      totalMarks: 10,
      status: 'active',
      createdAt: Date.now(),
      questions: [
        { text: 'Which of the following is NOT a programming language?', options: ['Python', 'Java', 'HTML', 'C++'], correct: 2 },
        { text: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Unit', 'Central Peripheral Unit'], correct: 0 },
        { text: 'What is an algorithm?', options: ['A type of computer', 'Step-by-step instructions to solve a problem', 'A programming language', 'A storage device'], correct: 1 },
        { text: 'Which data structure uses LIFO?', options: ['Queue', 'Array', 'Stack', 'Linked List'], correct: 2 },
        { text: 'What is a variable?', options: ['A fixed value', 'A named storage location', 'A function', 'A loop'], correct: 1 },
        { text: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink Text Mode Language'], correct: 0 },
        { text: 'Which loop runs at least once?', options: ['for loop', 'while loop', 'do-while loop', 'foreach loop'], correct: 2 },
        { text: 'What is a compiler?', options: ['An input device', 'A program that translates source code', 'An output device', 'A storage medium'], correct: 1 },
        { text: 'Which symbol is used for comments in Python?', options: ['//', '/* */', '#', '--'], correct: 2 },
        { text: 'Binary number system uses which digits?', options: ['0-9', '0 and 1', 'A-F', '0-7'], correct: 1 },
      ]
    },
    {
      title: 'Database Management Systems',
      subject: 'DBMS',
      description: 'SQL, normalization, transactions, and database design principles',
      duration: 45,
      passingScore: 60,
      totalMarks: 10,
      status: 'active',
      createdAt: Date.now(),
      questions: [
        { text: 'What does SQL stand for?', options: ['Structured Query Language', 'Simple Query Language', 'Standard Query Logic', 'System Query Language'], correct: 0 },
        { text: 'Which SQL command is used to retrieve data?', options: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'], correct: 2 },
        { text: 'What is a primary key?', options: ['A foreign key reference', 'Unique identifier for a record', 'A type of index', 'A composite attribute'], correct: 1 },
        { text: 'Which normal form eliminates partial dependencies?', options: ['1NF', '2NF', '3NF', 'BCNF'], correct: 1 },
        { text: 'ACID properties stand for?', options: ['Access, Commit, Isolation, Durability', 'Atomicity, Consistency, Isolation, Durability', 'Atomicity, Control, Integration, Data', 'Access, Control, Isolation, Data'], correct: 1 },
        { text: 'What is a foreign key?', options: ['A key from another country', 'References primary key of another table', 'An encrypted key', 'A composite key'], correct: 1 },
        { text: 'Which JOIN returns all records from both tables?', options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'], correct: 3 },
        { text: 'What is normalization?', options: ['Encrypting data', 'Organizing data to reduce redundancy', 'Backing up data', 'Sorting data'], correct: 1 },
        { text: 'DDL stands for?', options: ['Data Definition Language', 'Data Delivery Language', 'Database Design Language', 'Data Display Language'], correct: 0 },
        { text: 'Which command permanently saves a transaction?', options: ['SAVE', 'ROLLBACK', 'COMMIT', 'END'], correct: 2 },
      ]
    },
    {
      title: 'Operating Systems',
      subject: 'OS',
      description: 'Process management, memory, file systems, and scheduling algorithms',
      duration: 40,
      passingScore: 55,
      totalMarks: 10,
      status: 'active',
      createdAt: Date.now(),
      questions: [
        { text: 'What is an Operating System?', options: ['Application software', 'System software managing hardware/software', 'A programming language', 'A database'], correct: 1 },
        { text: 'Which scheduling algorithm gives the shortest waiting time?', options: ['FCFS', 'Round Robin', 'SJF', 'Priority'], correct: 2 },
        { text: 'What is a deadlock?', options: ['System crash', 'Processes waiting for each other indefinitely', 'Memory overflow', 'CPU overload'], correct: 1 },
        { text: 'Virtual memory allows?', options: ['Faster CPU speed', 'More RAM to be installed', 'Programs to use more memory than physically available', 'Faster disk access'], correct: 2 },
        { text: 'What is a semaphore?', options: ['A type of CPU', 'Synchronization primitive for processes', 'A file system', 'A memory type'], correct: 1 },
        { text: 'Page replacement algorithm used in OS?', options: ['Quick Sort', 'LRU (Least Recently Used)', 'Binary Search', 'Dijkstra'], correct: 1 },
        { text: 'What does PCB stand for?', options: ['Program Control Block', 'Process Control Block', 'Processor Cycle Block', 'Program Cycle Buffer'], correct: 1 },
        { text: 'Thrashing in OS refers to?', options: ['Disk failure', 'Excessive paging reducing CPU utilization', 'Memory corruption', 'Network overload'], correct: 1 },
        { text: 'Which is NOT a state of a process?', options: ['Ready', 'Running', 'Blocked', 'Sleeping'], correct: 3 },
        { text: 'File allocation method with no external fragmentation?', options: ['Contiguous', 'Linked', 'Indexed', 'Sequential'], correct: 2 },
      ]
    }
  ];
