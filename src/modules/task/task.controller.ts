import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaskService } from './task.service';

@ApiBearerAuth()
@ApiTags('tasks')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task (Admin only)' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: any) {
    return this.taskService.create(createTaskDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with filters' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  findAll(@Query() filterDto: TaskFilterDto, @Request() req: any) {
    return this.taskService.findAll(filterDto, req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Manager access required' })
  getStats(@Request() req: any) {
    return this.taskService.getTaskStats(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task by ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.taskService.findOne(id, req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update a task (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Manager access required' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(@Body() updateTaskDto: UpdateTaskDto, @Request() req: any) {
    return this.taskService.update(updateTaskDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task (Admin only)' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.taskService.remove(id, req.user.id);
  }
}