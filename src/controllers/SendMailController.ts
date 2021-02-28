import { Request, Response } from 'express';
import { getCustomRepository } from 'typeorm';
import { resolve } from 'path';
import { SurveysRepository } from '../repositories/SurveysRepository';
import { UsersRepository } from '../repositories/UsersRepository';
import { SurveyUsersRepository } from '../repositories/SuveryUsersRepository'
import SendMailService from '../services/SendMailService';
import { AppError } from '../errors/AppError';

class SendMail {
    async execute(request: Request, response: Response){
        const { email, survey_id } = request.body;
        const usersRepository = getCustomRepository(UsersRepository);
        const surveysRepository = getCustomRepository(SurveysRepository);
        const surveyUsersRepository = getCustomRepository(SurveyUsersRepository);

        const user = await usersRepository.findOne({ email });
        if(!user){
            throw new AppError('User does not exists')
        }

        const survey = await surveysRepository.findOne({id: survey_id});
        if(!survey){
            throw new AppError('Survey does not exists')
        }

        const npsPath = resolve(__dirname, '..', 'views', 'emails', 'npsmail.hbs')

        const surveyUserAlreadyExists = await surveyUsersRepository.findOne({
            where: {user_id: user.id, value: null},
            relations: ['user', 'survey']
        })

        const variables = {
            name: user.name,
            title: survey.title,
            description: survey.description,
            id: '',
            link: process.env.URL_MAIL
        }

        if(surveyUserAlreadyExists){
            variables.id = surveyUserAlreadyExists.id;
            await SendMailService.execute(email, survey.title, variables, npsPath);
            return response.json(surveyUserAlreadyExists);
        }

        const surveyUser = surveyUsersRepository.create({
            user_id: user.id,
            survey_id
        })
        await surveyUsersRepository.save(surveyUser)

        variables.id = surveyUser.id;

        await SendMailService.execute(email, survey.title, variables, npsPath);

        return response.status(200).json(surveyUser)

    }
}

export { SendMail }