import express from 'express';
import { identifyContactController } from './contactController';

const app = express();
app.use(express.json());

app.post('/identify', identifyContactController);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 