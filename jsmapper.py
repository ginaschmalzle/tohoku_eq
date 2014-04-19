#!/usr/bin/python


with open('mainG.js') as fp:
	for line in fp:
	    	if "= function" in line:
			print line
