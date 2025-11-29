const bcrypt = require('bcrypt');

const password = 'password';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('Match:', bcrypt.compareSync(password, hash));
