import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import os
# from pymongo import MongoClient
import librosa
import time
import numpy as np

from tornado.options import define, options

current_milli_time = lambda: int(round(time.time() * 1000))

define("port", default=8888, help="run on the given port", type=int)

class Application(tornado.web.Application):
    def __init__(self):
        # client = MongoClient('localhost', 27017)
        # db = client.user_database
        # self.user_collection = db.user_collection

        handlers = [
        (r"/audio", SoundHandler),
        (r'/(.*)', tornado.web.StaticFileHandler, {'path': os.path.dirname(__file__)})
        ]
        tornado.web.Application.__init__(self, handlers)

class SoundHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")

    def post(self):
        if 'audio' not in self.request.files:
            self.finish({'Error': "No audio provided"})
        audio_filename = str(current_milli_time()) + '.wav'
        audio_file = os.path.join('/Users/aditi/Desktop/Freelance/speaking_finger/audios', audio_filename)
        audio = self.request.files['audio'][0]
        with open(audio_file, 'wb') as f:
            f.write(audio['body'])

        SAMPLE_RATE = 16000
        sound, sr = librosa.load(audio_file)
        SAMPLE_RATE = sr

        o_env = librosa.onset.onset_strength(sound, sr=SAMPLE_RATE)
        onset_frames = librosa.onset.onset_detect(onset_envelope=o_env, sr=SAMPLE_RATE)
        times = librosa.frames_to_time(onset_frames, sr=SAMPLE_RATE)

        # print(times)

        self.write({"times_array": times})

def main():
    tornado.options.parse_command_line()
    http_server = tornado.httpserver.HTTPServer(Application())
    http_server.listen(tornado.options.options.port)    
    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    main()
