/**
 * Created by zheqi on 2016/1/21.
 */
'use strict';

var LocalStrategy   = require('passport-local').Strategy,
    mongoose        = require('mongoose'),
    User            = mongoose.model('User'),
    Remember        = mongoose.model('Remember'),
    path            = require('path');

module.exports = function(env, passport, transporter) {
    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    var newEndToken = function(cLogin, cId, callback) {
        var newEndToken = new Remember();
        newEndToken.login = cLogin;
        newEndToken.serial_id = cId;
        newEndToken.token = Math.random().toString(36).substr(2, 10);
        newEndToken.save(callback);
    };

    /**
     * 注册操作
     */
    passport.use('local-signup', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    function(req, email, password, done) {
        process.nextTick(function() {       // 一旦当前时间循环完成，就执行函数
            User.findOne({'email': email}, function(err, user) {
                if (err) {return done(err);}
                if (user) {
                    return done(null, false, { message: 'email already there!' })
                } else {
                    var validMailKey = Math.random().toString(36).substr(2, 10);
                    var newUser = new User();
                    newUser.firstName = req.body.firstName;
                    newUser.lastName = req.body.lastName;
                    newUser.email = req.body.email;
                    newUser.password = newUser.generateHash(password);
                    newUser.emailConfirm = false;
                    newUser.emailKey = validMailKey;
                    newUser.save(function(err) {
                        if (err) {throw err;}
                        var mailOptions = require(path.join(__dirname, '../../templates/confirm-mail-cn'))(email, req.body.fullname, validMailKey);
                        transporter.sendMail(mailOptions, function(error, info) {
                            if (error) { console.log(error); }
                            console.log(info.response);
                            return done(null, newUser);
                        });
                    })
                }
            })
        })
    }
    ));


    /**
     * 登录操作
     */
    passport.use('local-signin', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true,
        allowNoField : true
    },
    function(req, email, password, done) {
        if (email && password) {
            User.findOne({'email': email}, function(err, user) {
                if (err) {return done(err);}
                if (!user) {return done(null, false, {message: 'No user found.' }) }
                if (!user.validPassword(password)) {return done(null, false, {message: 'Wrong password.'});}
                if (req.body.remember) {
                    return Remember.find({login: email}).remove().exec(function (err) {
                        if (err) {return done(err);}
                        newEndToken(email, Math.random().toString(36).substr(2,10), function (err) {
                            if (err) {return done(err);}
                            return done(null, user);
                        });
                    });
                }
                return done(null, user);
            });
        } else {
            if (req.cookies && req.cookies.remember) {
                var rememberCookie = req.cookies.remember;
                var cookieLogin = rememberCookie.split('#')[0];
                var cookieId = rememberCookie.split('#')[1].substr(0,10);
                var cookieToken = rememberCookie.split('#')[1].replace(cookieId, '');
                Remember
                    .findOne({login: cookieLogin, serial_id: cookieId})
                    .exec(function (err, endToken) {
                        if (err) {return done(err);}
                        if(!endToken) {return done(null, null);}
                        if(endToken && endToken.token !== cookieToken) {
                            endToken.remove(function (err) {
                                if (err) {return done(err);}
                                var mailOptions = require(path.join(__dirname, '../../templates/theft-mail-cn'))(cookieLogin);
                                transporter.sendMail(mailOptions, function (err, info) {
                                    if (err) {console.log(err);}
                                    console.log(info.response);
                                });
                                return done(null, false, req.flash('signInMessage', 'theft tentative detected.'));
                            });
                        } else {
                            newEndToken(cookieLogin, cookieId, function (err) {
                                if (err) {return done(err);}
                                endToken.remove(function (err) {
                                    if (err) {return done(err);}
                                    User.findOne({email: cookieLogin}).exec(function (err, user) {
                                        if (err) {return done(err);}
                                        return done(null, user);
                                    });
                                });
                            });
                        }
                    });
            } else {
                return done(null, null);
            }
        }
    }
    ))
}
